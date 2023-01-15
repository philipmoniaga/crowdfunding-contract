// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

import {IConfigStore} from "./interfaces/IConfigStore.sol";
import {TerminalUtility, ITerminalDirectory} from "./abstract/TerminalUtility.sol";
import {IDAOGovernorBooster, IProjects} from "./interfaces/IDAOGovernorBooster.sol";

contract DAOGovernorBooster is IDAOGovernorBooster, TerminalUtility, ERC1155Holder {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    modifier onlyAdmin(uint256 _projectId) {
        if (adminOf[_projectId] != msg.sender) revert UnAuthorized();
        _;
    }
    modifier onlyProjectOwner(uint256 _projectId) {
        if (msg.sender != projects.ownerOf(_projectId)) revert NotProjectOwner();
        _;
    }

    /*╔═════════════════════════════╗
      ║   Private Stored Constants  ║
      ╚═════════════════════════════╝*/
    uint256 private constant SECONDS_IN_MONTH = 2592000;

    /*╔═════════════════════════════╗
      ║    Public Stored Constants  ║
      ╚═════════════════════════════╝*/
    uint256 public constant PROPOSE_ETH = 1e15; // TODO 1eth=1e18 stake 1 ETH to propose, WETH with 18 decimals

    IProjects public immutable projects;

    IConfigStore public immutable configStore;

    /*╔═════════════════════════════╗
      ║  Public Stored Properties   ║
      ╚═════════════════════════════╝*/
    // 10 => 10%, the minimum quorem needs for a proposal
    uint256 public proposalRate = 10;

    uint256 public recordId;

    // proposal
    mapping(uint256 => Counters.Counter) public proposalIdOf;

    // The ID of the DAO => proposalId => StakeETH
    mapping(uint256 => mapping(uint256 => uint256)) public stakedETHOf;

    // The ID of the DAO => proposalId => proposal
    mapping(uint256 => mapping(uint256 => Proposal)) public proposalOf;

    // The ID of the DAO => the membershipPass address
    mapping(uint256 => address) public membershipPassOf;

    // The ID of the DAO => tierId => multiper
    mapping(uint256 => mapping(uint256 => uint256)) public tierReputationMultiplierOf;

    // The ID of the DAO => Stake Pass Record ID => stake record
    mapping(address => mapping(uint256 => StakeRecord)) public stakesOf;

    // Wallet Address => project id => record ids
    mapping(address => mapping(uint256 => uint256[])) public recordOf;

    // The ID of the Proposal => Voting Result
    mapping(uint256 => Vote) public votesOf;

    // The ID of the DAO => Wallet Address
    mapping(uint256 => address) public adminOf;

    /*╔══════════════════╗
      ║   External VIEW  ║
      ╚══════════════════╝*/

    /**
        @notice
        Calculate the reputation points of the wallet address

        @param _projectId The ID of the DAO 
        @param _from The wallet address that you want to get Points
     */
    function getReputation(uint256 _projectId, address _from) public view returns (uint256) {
        uint256[] memory _records = recordOf[_from][_projectId];

        if (_records.length == 0) return 0;

        uint256 _reputation;
        for (uint256 i; i < _records.length;) {
            StakeRecord memory _record = stakesOf[_from][_records[i]];
            if (block.timestamp < _record.expiry) {
                _reputation += _record.point;
            }
            unchecked {
                i++;
            }
        }

        return _reputation;
    }

    /*╔═════════════════════════╗
      ║   External Transaction  ║
      ╚═════════════════════════╝*/

    constructor(
        IProjects _projects,
        IConfigStore _configStore,
        ITerminalDirectory _terminalDirectory
    ) TerminalUtility(_terminalDirectory) {
        projects = _projects;
        configStore = _configStore;
    }

    /**
        @notice
        Setup / create the admin for the governor in the DAO

        @param _projectId The ID of the DAO
        @param _multipliers Multiplier for tier reputations
        @param _membershipPass Membership-pass of the DAO
        @param _admin The admin of the DAO who can revert the impractical proposals
     */
    function createGovernor(
        uint256 _projectId,
        uint256[] calldata _multipliers,
        address _membershipPass,
        address _admin
    ) external override onlyTerminal(_projectId) {
        adminOf[_projectId] = _admin;
        membershipPassOf[_projectId] = _membershipPass;
        for(uint256 i; i < _multipliers.length;) {
            tierReputationMultiplierOf[_projectId][i] = _multipliers[i];
            unchecked {
                i++;
            }
        }

        emit CreateGovernor(_projectId, _membershipPass, _multipliers, _admin);
    }

    /**
        @notice
        Create a proposal 

        @dev
        There has different types of proposals, only the DAO Owner can create the proposal that enable to unlock the treasury

        @param _projectId The ID of the DAO
        @param _properties The data properties of proposal
        @param _target The address of Treasury account
        @param _value The value of ETH
        @param _signature The signature of the proposal
        @param _calldata The data of the proposal
     */
    function propose(
        uint256 _projectId,
        ProposalParameter calldata _properties,
        address _target,
        uint256 _value,
        string calldata _signature,
        bytes calldata _calldata
    ) external payable override onlyProjectOwner(_projectId) {
        if (_properties.start >= _properties.end || block.timestamp >= _properties.end)
            revert BadPeriod();
        if (msg.value < PROPOSE_ETH) revert InsufficientBalance();

        proposalIdOf[_projectId].increment();
        uint256 _proposalId = proposalIdOf[_projectId].current();
        stakedETHOf[_projectId][_proposalId] = msg.value;

        bytes32 _hash = keccak256(abi.encodePacked(_target, _value, _signature, _calldata));

        proposalOf[_projectId][_proposalId] = Proposal({
            id: _proposalId,
            hash: _hash,
            ipfsHash: _properties.ipfsHash,
            start: _properties.start,
            end: _properties.end,
            minVotes: _ceilDiv(votesOf[_projectId].totalVotes),
            minVoters: _ceilDiv(votesOf[_projectId].totalVoters),
            state: _properties.start > block.timestamp
                ? ProposalState.Active
                : ProposalState.Pending
        });

        emit ProposalCreated(_projectId, msg.sender, _proposalId);
    }

    /**
        @notice
        Execute the proposal

        @param _projectId The ID of the DAO
        @param _proposalId The ID of the proposal to execute
        @param _proposeResult The proposal result, 0=true 1=false
        @param _signatureBySigner the signature signed by signer
     */
    function execute(
        uint256 _projectId,
        uint256 _proposalId,
        uint8 _proposeResult,
        bytes memory _signatureBySigner,
        address _target,
        uint256 _value,
        string memory _signature,
        bytes memory _data
    ) external override onlyProjectOwner(_projectId) returns (bytes memory _executeReturns) {
        Proposal storage _proposal = proposalOf[_projectId][_proposalId];
        if (_proposal.id != _proposalId) revert UnknowProposal();
        if (block.timestamp < _proposal.end || _proposal.state == ProposalState.Executed)
            revert BadPeriod();
        if (!_isAuthorized(msg.sender, _proposalId, _proposeResult, _signatureBySigner))
            revert InvalidSignature();

        bytes32 _hash = keccak256(abi.encodePacked(_target, _value, _signature, _data));
        if (_proposal.hash != _hash) revert TransactionNotMatch();

        _proposal.state = ProposalState.Executed;

        if (_proposeResult == 0) {
            bytes memory _callData;

            if (bytes(_signature).length == 0) {
                _callData = _data;
            } else {
                _callData = abi.encodePacked(bytes4(keccak256(bytes(_signature))), _data);
            }
            // solhint-disable-next-line avoid-low-level-calls
            (bool _success, bytes memory _returnData) = _target.call{value: _value}(_callData);
            if (!_success) revert TransactionReverted();
            _executeReturns = _returnData;
        }
        // return staked eth in this proposal
        uint256 staked = stakedETHOf[_projectId][_proposalId];
        stakedETHOf[_projectId][_proposalId] = 0;
        Address.sendValue(payable(msg.sender), staked);

        emit ExecuteProposal(_projectId, msg.sender, _proposalId, _proposeResult);
    }

    /**
        @notice
        Admin can revert the incorrect proposal

        @param _projectId the project id of proposal belows to
        @param _proposalId the proposal id which try to revert
     */
    function revertProposal(uint256 _projectId, uint256 _proposalId)
        external
        onlyAdmin(_projectId)
    {
        if (proposalOf[_projectId][_proposalId].id == 0) revert UnknowProposal();

        delete proposalOf[_projectId][_proposalId];
    }

    /**
        @notice
        Stake Membership-pass to get reputation

        @param _projectId The ID of the DAO that user want to stake
        @param _membershipPass Membership-Pass details
     */
    function stakePass(uint256 _projectId, PassStake[] memory _membershipPass)
        external
        override
        returns (uint256 _reputation)
    {
        address _from = msg.sender;
        if (_membershipPass.length == 0) return 0;
        if (!_isMemberOfProject(_projectId, _from)) votesOf[_projectId].totalVoters += 1;

        uint256[] memory _tiers = new uint256[](_membershipPass.length);
        uint256[] memory _amounts = new uint256[](_membershipPass.length);
        for (uint8 i; i < _membershipPass.length;) {
            _tiers[i] = _membershipPass[i].tier;
            _amounts[i] = _membershipPass[i].amount;
            if (_amounts[i] == 0) revert BadAmount();
            unchecked {
                recordId ++;
            }
            recordOf[_from][_projectId].push(recordId);

            stakesOf[_from][recordId] = StakeRecord({
                tier: _tiers[i],
                amount: _amounts[i],
                stakeAt: block.timestamp,
                expiry: block.timestamp + SECONDS_IN_MONTH * _membershipPass[i].duration,
                point: tierReputationMultiplierOf[_projectId][_tiers[i]] *
                    _membershipPass[i].duration * // TODO: Duration should be based on 1 month, 3 months, 6 months, 12 months
                    _amounts[i]
            });
            unchecked {
                i++;
            }
        }
        IERC1155(membershipPassOf[_projectId]).safeBatchTransferFrom(
            _from,
            address(this),
            _tiers,
            _amounts,
            "0x00"
        );
        // TODO: if Gold Pass: 3pts, Silver: 2pts |  lock 1 month => *1, lock 3 momth => *3
        // how to store the data for user lock Pass multiple times. (數據儲存問題、迴圈查詢、)

        _reputation = getReputation(_projectId, _from);

        votesOf[_projectId].totalVotes += _reputation;

        emit StakePass(_projectId, _from, _reputation, _tiers, _amounts);
    }

    /**
        @notice
        Unstake MembershipPass

        @param _projectId the project to unstake
     */
    function unStakePass(uint256 _projectId, uint256[] memory _recordIds)
        external
        override
        returns (uint256 _reputation)
    {
        address _recepient = msg.sender;

        uint256[] memory _tiers = new uint256[](_recordIds.length);
        uint256[] memory _amounts = new uint256[](_recordIds.length);
        for (uint8 i; i < _recordIds.length;) {
            StakeRecord memory record = stakesOf[_recepient][_recordIds[i]];
            if (record.amount == 0) revert InvalidRecord();
            if (block.timestamp < record.expiry) revert NotExpired();
            _tiers[i] = record.tier;
            _amounts[i] = record.amount;
            delete stakesOf[_recepient][_recordIds[i]];
            delete recordOf[_recepient][_projectId][_recordIds[i]];
            unchecked {
                i++;
            }
        }
        IERC1155(membershipPassOf[_projectId]).safeBatchTransferFrom(
            address(this),
            _recepient,
            _tiers,
            _amounts,
            "0x00"
        );
        bool _isMemberAfterRedeem = _isMemberOfProject(_projectId, _recepient);
        if (!_isMemberAfterRedeem) {
            votesOf[_projectId].totalVoters -= 1;
            delete recordOf[_recepient][_projectId];
        }

        _reputation = getReputation(_projectId, _recepient);

        votesOf[_projectId].totalVotes -= _reputation;

        emit UnStakePass(_projectId, _recepient, _reputation, _tiers, _amounts);
    }

    /*╔═════════════════════════════╗
      ║   Private Helper Functions  ║
      ╚═════════════════════════════╝*/

    /**
        @notice
        Verify the signature

        @param _from the proposal creator
        @param _proposalId the target proposal
        @param _proposeResult the result of proposal 0=true 1=false
        @param _signature signature signed by signer address
     */
    function _isAuthorized(
        address _from,
        uint256 _proposalId,
        uint8 _proposeResult,
        bytes memory _signature
    ) private view returns (bool) {
        bytes32 _hash = keccak256(abi.encodePacked(_from, _proposalId, _proposeResult));
        return configStore.signer() == ECDSA.recover(_hash, _signature);
    }

    /**
        @notice
        Returns the integer division of points. The result is rounded up

        @param _point points
     */
    function _ceilDiv(uint256 _point) private view returns (uint256 _ceiled) {
        _ceiled = (_point * proposalRate + 100 - 1) / 100;
        if (_ceiled == 0) _ceiled = 1;
    }

    /**
        @notice
        Check a wallet address is member of giving project or not

        @param _projectId The ID of DAO
        @param _from The wallet address you wanna check with
     */
    function _isMemberOfProject(uint256 _projectId, address _from) private view returns (bool) {
        uint256[] memory _records = recordOf[_from][_projectId];
        if (_records.length == 0) return false;
        for (uint256 i; i < _records.length;) {
            if (_records[i] != 0) return true;
            unchecked {
                i++;
            }
        }

        return false;
    }
}
