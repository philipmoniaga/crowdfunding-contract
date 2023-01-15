// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./IProjects.sol";

interface IDAOGovernorBooster {
    enum ProposalState {
        Pending,
        Active,
        Queued,
        Failed,
        Expired,
        Executed
    }

    struct Proposal {
        string ipfsHash;
        uint256 id;
        bytes32 hash;
        uint256 start;
        uint256 end;
        uint256 minVoters;
        uint256 minVotes;
        ProposalState state;
    }

    struct ProposalParameter {
        string ipfsHash;
        uint256 start;
        uint256 end;
    }

    struct Vote {
        uint256 totalVoters;
        uint256 totalVotes;
    }

    struct PassStake {
        uint256 tier;
        uint256 amount; // ERC721: 1
        uint8 duration; // duartion in day
    }

    struct StakeRecord {
        uint256 tier;
        uint256 amount; // ERC721: 1
        uint256 point;
        uint256 stakeAt;
        uint256 expiry;
    }

    /************************* EVENTS *************************/
    event CreateGovernor(
        uint256 indexed projectId,
        address membershipPass,
        uint256[] multipers,
        address admin
    );

    event ProposalCreated(uint256 indexed projectId, address indexed from, uint256 proposalId);

    event ExecuteProposal(
        uint256 indexed projectId,
        address indexed from,
        uint256 proposalId,
        uint8 proposalResult
    );

    event StakePass(
        uint256 indexed projectId,
        address indexed from,
        uint256 points,
        uint256[] tierIds,
        uint256[] amounts
    );

    event UnStakePass(
        uint256 indexed projectId,
        address indexed from,
        uint256 points,
        uint256[] tierIds,
        uint256[] amounts
    );

    /************************* ERRORS *************************/
    error InsufficientBalance();
    error UnknowProposal();
    error BadPeriod();
    error InvalidSignature();
    error TransactionNotMatch();
    error TransactionReverted();
    error NotProjectOwner();
    error BadAmount();
    error NotExpired();
    error InvalidRecord();

    function createGovernor(
        uint256 _projectId,
        uint256[] calldata _multipers,
        address _membershipPass,
        address _admin
    ) external;

    function propose(
        uint256 _projectId,
        ProposalParameter calldata _properties,
        address _target,
        uint256 _value,
        string calldata _signature,
        bytes calldata _calldata
    ) external payable;

    function execute(
        uint256 _projectId,
        uint256 _proposalId,
        uint8 _proposeResult,
        bytes memory _signatureBySigner,
        address _target,
        uint256 _value,
        string memory _signature,
        bytes memory _data
    ) external returns (bytes memory);

    function stakePass(uint256 _projectId, PassStake[] memory _membershipPass)
        external
        returns (uint256);

    function unStakePass(uint256 _projectId, uint256[] memory _recordIds)
        external
        returns (uint256);
}
