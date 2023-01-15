// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

import {IBluechipsBooster, IERC721} from "./interfaces/IBluechipsBooster.sol";
import {AdminUtility} from "./abstract/AdminUtility.sol";
import {TerminalUtility, ITerminalDirectory} from "./abstract/TerminalUtility.sol";

contract BluechipsBooster is IBluechipsBooster, ERC721, AdminUtility, TerminalUtility {
    /*╔═════════════════════════════╗
      ║   Private Stored Constants  ║
      ╚═════════════════════════════╝*/

    uint16 private constant MAX_MULTIPLIER_OF_BLUECHIPS = 150;
    uint16 private constant MAX_MULTIPLIER_OF_CUSTOMIZED = 300;
    uint256 private constant SECONDS_IN_DAY = 86400;

    /*╔═════════════════════════════╗
      ║    Public Stored Constants  ║
      ╚═════════════════════════════╝*/

    uint256 public constant PROOF_ETH = 1e15; // TODO 1eth=1e18 stake 1 ETH to proof

    /*╔═════════════════════════════╗
      ║  Public Stored Properties   ║
      ╚═════════════════════════════╝*/

    uint256 public override count;

    mapping(bytes32 => uint256) public override tokenIdOf;

    // Bytescode => Wallet Address
    mapping(bytes32 => address) public override proofBy;

    // Multiplier for each Bluechips NFT
    // 123 => 1.23x Max multiplier: 150
    mapping(address => uint16) public override multiplierOf;

    // Final Boost ratio for Bluechips NFT in each wallet address
    mapping(address => uint256) public override boosterWeights;

    // Expired timestamp for each proof
    mapping(bytes32 => uint256) public override proofExpiryOf;

    // The Bytescode of bluechips NFT => The amount of staked ETH
    mapping(bytes32 => uint256) public override stakedOf;

    // daoId => Customized NFT Token Address => multiper
    // 123 => 1.23x Max multiplier: 300
    mapping(uint256 => mapping(address => uint16)) public override customMultiplierOf;

    // daoId => Wallet Address => booster weights
    mapping(uint256 => mapping(address => uint256)) public override customBoosterWeights;

    /*╔══════════════════╗
      ║   External VIEW  ║
      ╚══════════════════╝*/

    /**
        @notice
        Return the weights of an address weights = universal weights * customized weights

        @param _projectId the project id of query
        @param _from wallet address
     */
    function getBoosterWeight(uint256 _projectId, address _from)
        external
        view
        returns (uint256 _weight)
    {
        _weight =
            _getNoZero(boosterWeights[_from]) *
            _getNoZero(customBoosterWeights[_projectId][_from]);
    }

    /*╔═════════════════════════╗
      ║   External Transaction  ║
      ╚═════════════════════════╝*/

    /**
        @notice
        Punk:   x1.5   (150)
        BAYC:   x1.5   (150)
        Azuki:  x1.35  (135)
        Doodle: x1.2   (120)
        CloneX: x1.1   (110)

        There has 2 types of Boost: BlueChips NFT and Customized NFT based on which DAO you set.
        For customized NFT support in each DAO, will be followed by the configure when the DAO created.
     */
    constructor(
        address[] memory _bluechips,
        uint16[] memory _multipers,
        address _superAdmin,
        ITerminalDirectory _terminalDirectory
    )
        ERC721("BlueChip Stake Proof", "STAKEPROOF")
        AdminUtility(_superAdmin)
        TerminalUtility(_terminalDirectory)
    {
        if (_bluechips.length != _multipers.length) revert SizeNotMatch();
        for (uint256 i; i < _bluechips.length;) {
            if (_bluechips[i] == address(0)) revert ZeroAddress();
            if (_multipers[i] == 0 || _multipers[i] > MAX_MULTIPLIER_OF_BLUECHIPS)
                revert BadMultiper();

            multiplierOf[_bluechips[i]] = _multipers[i];
            
            emit AddBluechip(_bluechips[i], _multipers[i]);

            unchecked {
                i++;
            }
        }
    }

    /**
        @notice
        DAO Creator able to set the customized NFT support to boost DAO points

        @param _projectId The DAO ID
        @param _bluechips The customized NFTs token addresses
        @param _multipers multipliers of each nft 300 => 3x
     */
    function createCustomBooster(
        uint256 _projectId,
        address[] memory _bluechips,
        uint16[] memory _multipers
    ) external override onlyTerminal(_projectId) {
        if (_bluechips.length != _multipers.length) revert SizeNotMatch();
        for (uint256 i; i < _bluechips.length;) {
            if (_bluechips[i] == address(0)) revert ZeroAddress();
            if (customMultiplierOf[_projectId][_bluechips[i]] > 0) revert BoosterRegisterd();
            if (_multipers[i] == 0 || _multipers[i] > MAX_MULTIPLIER_OF_CUSTOMIZED)
                revert BadMultiper();
            customMultiplierOf[_projectId][_bluechips[i]] = _multipers[i];
            unchecked {
                i++;
            }
        }

        emit AddCustomBooster(_projectId, _bluechips, _multipers);
    }

    /**
        @notice
        People who have the bluechip NFTs can create a proof that promises they will hold the NFTs for 30 days        

        @param _bluechip The bluechip NFT Address(ERC721) you want to proof
        @param _tokenId which tokenID you want to proof
     */
    function createProof(address _bluechip, uint256 _tokenId) external payable override {
        // Only the Bluechips NFT holder able to call this function.
        address _from = msg.sender;

        if (multiplierOf[_bluechip] == 0) revert BoosterNotRegisterd();

        // Create a ERC721 token for caller
        if (IERC721(_bluechip).ownerOf(_tokenId) != _from) revert NotNFTOwner();
        if (msg.value < PROOF_ETH) revert InsufficientBalance(); // Collateral ETH

        // Based on specific Bluechips NFT Token Address, plus which tokenID encoded
        bytes32 _proof = keccak256(abi.encodePacked(_bluechip, _tokenId));

        address _preOwner = proofBy[_proof];
        if (_preOwner == _from) revert RenewFirst();

        if (_preOwner != address(0)) {
            _redeem(_bluechip, _tokenId, _proof, _from, _preOwner);
        }

        proofBy[_proof] = _from;
        uint256 _weight = _getNoZero(boosterWeights[_from]) * multiplierOf[_bluechip];
        boosterWeights[_from] = _weight;

        uint256 _proofExpiry = block.timestamp + 30 * SECONDS_IN_DAY;
        proofExpiryOf[_proof] = _proofExpiry;
        stakedOf[_proof] = msg.value;

        count++;

        // Mint the stake proof
        _safeMint(_from, count);

        tokenIdOf[_proof] = count;

        emit CreateProof(_from, _bluechip, _tokenId, _proof, _proofExpiry, _weight);
    }

    /**
        @notice
        People who have the customized nfts can create a proof which promises that they will hold the nfts for 30 days

        @param _bluechip The customized NFT Token Addresses
        @param _tokenId The ID of the NFT in token address
        @param _projectId The ID of the DAO you want to register this proof
     */
    function createCustomProof(
        address _bluechip,
        uint256 _tokenId,
        uint256 _projectId
    ) external payable override {
        address _from = msg.sender;

        if (customMultiplierOf[_projectId][_bluechip] == 0) revert BoosterNotRegisterd();
        if (IERC721(_bluechip).ownerOf(_tokenId) != _from) revert NotNFTOwner();
        if (msg.value < PROOF_ETH) revert InsufficientBalance();

        bytes32 _proof = keccak256(abi.encodePacked(_projectId, _bluechip, _tokenId));

        address _preOwner = proofBy[_proof];
        if (_preOwner == _from) revert RenewFirst();

        if (_preOwner != address(0)) {
            _redeem(_bluechip, _tokenId, _proof, _from, _preOwner, _projectId);
        }

        proofBy[_proof] = _from;

        uint256 _weight = _getNoZero(customBoosterWeights[_projectId][_from]) *
            customMultiplierOf[_projectId][_bluechip];

        customBoosterWeights[_projectId][_from] = _weight;

        uint256 _proofExpiry = block.timestamp + 30 * SECONDS_IN_DAY;
        proofExpiryOf[_proof] = _proofExpiry;
        stakedOf[_proof] = msg.value;

        emit CreateCustomizedProof(
            _projectId,
            _from,
            _bluechip,
            _tokenId,
            _proof,
            _proofExpiry,
            _weight
        );
    }

    /**
        @notice
        Anyone can challenge a proof if the bluechip no longer belong to the pre owner

        @param _bluechip the bluechip nft address you want to challenge
        @param _tokenId which token you want to challenge
     */
    function challengeProof(address _bluechip, uint256 _tokenId) external override {
        bytes32 _proof = keccak256(abi.encodePacked(_bluechip, _tokenId));
        address _creator = proofBy[_proof];
        if (_creator == address(0)) revert ProofNotRegisterd();
        if (IERC721(_bluechip).ownerOf(_tokenId) == _creator) revert ChallengeFailed();

        _redeem(_bluechip, _tokenId, _proof, msg.sender, _creator);

        emit ChallengeProof(msg.sender, _bluechip, _tokenId, _proof);
    }

    /**
        @notice
        Anyone can challenge a proof if the customized NFT no longer belong to the pre owner

        @param _bluechip the cutomized nft address you want to challenge
        @param _tokenId which token you want to challenge
        @param _projectId The ID of DAO for this cusotmized NFT you want to register
     */
    function challengeCustomProof(
        address _bluechip,
        uint256 _tokenId,
        uint256 _projectId
    ) external override {
        bytes32 _proof = keccak256(abi.encodePacked(_projectId, _bluechip, _tokenId));
        address _creator = proofBy[_proof];
        if (_creator == address(0)) revert ProofNotRegisterd();
        if (IERC721(_bluechip).ownerOf(_tokenId) == _creator) revert ChallengeFailed();

        _redeem(_bluechip, _tokenId, _proof, msg.sender, _creator, _projectId);

        emit ChallengeCustomizedProof(_projectId, msg.sender, _bluechip, _tokenId, _proof);
    }

    /**
        @notice
        The proof owner can renew the proof. Don't need to pay for renew

        @param _bluechip the bluechip nft address to renew
        @param _tokenId which token you want to renew
     */
    function renewProof(address _bluechip, uint256 _tokenId) external override {
        address _from = msg.sender;
        bytes32 _proof = keccak256(abi.encodePacked(_bluechip, _tokenId));
        address _creator = proofBy[_proof];
        if (_from != _creator || IERC721(_bluechip).ownerOf(_tokenId) != msg.sender)
            revert UnAuthorized();

        uint256 _proofExpiry = block.timestamp + 30 * SECONDS_IN_DAY;
        proofExpiryOf[_proof] = _proofExpiry;

        emit RenewProof(_from, _bluechip, _tokenId, _proof, _proofExpiry);
    }

    /**
        @notice
        The proof owner can renew the proof. Don't need to pay for renew

        @param _bluechip The customized NFT token address to renew
        @param _tokenId which token you want to renew
        @param _projectId the project id of bluechip belongs
     */
    function renewCustomProof(
        address _bluechip,
        uint256 _tokenId,
        uint256 _projectId
    ) external override {
        address _from = msg.sender;
        bytes32 _proof = keccak256(abi.encodePacked(_projectId, _bluechip, _tokenId));
        address _creator = proofBy[_proof];
        if (_from != _creator || IERC721(_bluechip).ownerOf(_tokenId) != msg.sender)
            revert UnAuthorized();

        uint256 _proofExpiry = block.timestamp + 30 * SECONDS_IN_DAY;
        proofExpiryOf[_proof] = _proofExpiry;

        emit RenewCustomizedProof(_projectId, _from, _bluechip, _tokenId, _proof, _proofExpiry);
    }

    /**
        @notice
        The proof owner can redeem the proof

        @param _bluechip the bluechip nft address to redeem
        @param _tokenId which token you want to redeem
     */
    function redeemProof(address _bluechip, uint256 _tokenId) external override {
        address _from = msg.sender;
        bytes32 _proof = keccak256(abi.encodePacked(_bluechip, _tokenId));
        address _creator = proofBy[_proof];
        if (_from != _creator || _from != IERC721(_bluechip).ownerOf(_tokenId))
            revert UnAuthorized();
        if (block.timestamp < proofExpiryOf[_proof]) revert RedeemAfterExpired();

        _redeem(_bluechip, _tokenId, _proof, _from, _from);

        emit RedeemProof(_from, _bluechip, _tokenId, _proof);
    }

    /**
        @notice
        The proof owner can redeem the proof

        @param _bluechip the customized nft address to redeem
        @param _tokenId which token you want to redeem
        @param _projectId The ID of the DAO that the cusotmized NFT belongs with
     */
    function redeemCustomProof(
        address _bluechip,
        uint256 _tokenId,
        uint256 _projectId
    ) external override {
        address _from = msg.sender;
        bytes32 _proof = keccak256(abi.encodePacked(_projectId, _bluechip, _tokenId));
        address _creator = proofBy[_proof];
        if (_from != _creator || _from != IERC721(_bluechip).ownerOf(_tokenId))
            revert UnAuthorized();
        if (block.timestamp < proofExpiryOf[_proof]) revert RedeemAfterExpired();

        _redeem(_bluechip, _tokenId, _proof, _from, _from, _projectId);

        emit RedeemCustomizedProof(_projectId, _from, _bluechip, _tokenId, _proof);
    }

    /**
        @notice
        The governor can add a new universal bluechip as booster

        @param _bluechip bluechip address
        @param _multiper multiper of booster
     */
    function addBlueChip(address _bluechip, uint16 _multiper) external override onlyAdmin {
        if (_bluechip == address(0)) revert ZeroAddress();
        if (multiplierOf[_bluechip] != 0) revert ForbiddenUpdate();

        multiplierOf[_bluechip] = _multiper;

        emit AddBluechip(_bluechip, _multiper);
    }

    /*╔═════════════════════════════╗
      ║   Private Helper Functions  ║
      ╚═════════════════════════════╝*/

    /**
        @notice
        Redeem the proof of BlueChipsNFT

        @param _bluechip bluechip address
        @param _proof the proof need to delete
        @param _beneficiary the address to eceive challenge award
        @param _from pre owner of the proof
     */
    function _redeem(
        address _bluechip,
        uint256 _tokenId,
        bytes32 _proof,
        address _beneficiary,
        address _from
    ) private {
        Address.sendValue(payable(_beneficiary), stakedOf[_proof]);
        stakedOf[_proof] = 0;
        proofExpiryOf[_proof] = 0;
        boosterWeights[_from] = boosterWeights[_from] / multiplierOf[_bluechip];

        uint256 _tokenIdOfProof = tokenIdOf[_proof];
        _burn(_tokenIdOfProof);
        delete tokenIdOf[_proof];

        delete proofBy[_proof];

        emit Remove(_from, _beneficiary, _proof, _bluechip, _tokenId, boosterWeights[_from]);
    }

    /**
        @notice
        Redeem the proof for customized NFT

        @param _bluechip bluechip address
        @param _proof the proof need to delete
        @param _beneficiary the address to eceive challenge award
        @param _from pre owner of the proof
        @param _projectId the project id of bluechip belongs
     */
    function _redeem(
        address _bluechip,
        uint256 _tokenId,
        bytes32 _proof,
        address _beneficiary,
        address _from,
        uint256 _projectId
    ) private {
        Address.sendValue(payable(_beneficiary), stakedOf[_proof]);
        stakedOf[_proof] = 0;
        proofExpiryOf[_proof] = 0;

        customBoosterWeights[_projectId][_from] =
            customBoosterWeights[_projectId][_from] /
            customMultiplierOf[_projectId][_bluechip];

        delete proofBy[_proof];

        emit RemoveCustomize(
            _from,
            _beneficiary,
            _projectId,
            _proof,
            _bluechip,
            _tokenId,
            customBoosterWeights[_projectId][_from]
        );
    }

    /**
        @notice
        Disable the transfer behavior

        @param _from Transfer from
        @param _to Transfer to
        @param _tokenId Transfer token id
     */
    function _transfer(
        address _from,
        address _to,
        uint256 _tokenId
    ) internal override {
        super._transfer(_from, _to, _tokenId);
        revert TransferDisabled();
    }

    /**
        @notice
        Return the no zero value

        @param _a Giving value
     */
    function _getNoZero(uint256 _a) private pure returns (uint256) {
        return _a == 0 ? 1 : _a;
    }
}
