// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IBluechipsBooster {
    event CreateProof(
        address indexed from,
        address indexed bluechip,
        uint256 tokenId,
        bytes32 proof,
        uint256 proofExpiry,
        uint256 weight
    );

    event CreateCustomizedProof(
        uint256 indexed projectId,
        address indexed from,
        address indexed bluechip,
        uint256 tokenId,
        bytes32 proof,
        uint256 proofExpiry,
        uint256 weight
    );

    event ChallengeProof(
        address indexed from,
        address indexed bluechip,
        uint256 tokenId,
        bytes32 proof
    );

    event ChallengeCustomizedProof(
        uint256 indexed projectId,
        address indexed from,
        address indexed bluechip,
        uint256 tokenId,
        bytes32 proof
    );

    event RedeemProof(
        address indexed from,
        address indexed bluechip,
        uint256 tokenId,
        bytes32 proof
    );

    event RedeemCustomizedProof(
        uint256 indexed projectId,
        address indexed from,
        address indexed bluechip,
        uint256 tokenId,
        bytes32 proof
    );

    event RenewProof(
        address indexed from,
        address indexed bluechip,
        uint256 tokenId,
        bytes32 proof,
        uint256 proofExpiry
    );

    event RenewCustomizedProof(
        uint256 indexed projectId,
        address indexed from,
        address indexed bluechip,
        uint256 tokenId,
        bytes32 proof,
        uint256 proofExpiry
    );

    event Remove(
        address indexed from,
        address beneficiary,
        bytes32 proof,
        address indexed bluechip,
        uint256 tokenId,
        uint256 weight
    );

    event RemoveCustomize(
        address indexed from,
        address beneficiary,
        uint256 projectId,
        bytes32 proof,
        address indexed bluechip,
        uint256 tokenId,
        uint256 weight
    );

    event AddBluechip(address bluechip, uint16 multiper);

    event AddCustomBooster(uint256 indexed projectId, address[] bluechips, uint16[] multipers);

    error SizeNotMatch();
    error BadMultiper();
    error ZeroAddress();
    error RenewFirst();
    error NotNFTOwner();
    error InsufficientBalance();
    error BoosterRegisterd();
    error BoosterNotRegisterd();
    error ProofNotRegisterd();
    error ChallengeFailed();
    error RedeemAfterExpired();
    error ForbiddenUpdate();
    error OnlyGovernor();
    error TransferDisabled();

    function count() external view returns (uint256);

    function tokenIdOf(bytes32 _proof) external view returns (uint256);

    function proofBy(bytes32 _proof) external view returns (address);

    function multiplierOf(address _bluechip) external view returns (uint16);

    function boosterWeights(address _bluechip) external view returns (uint256);

    function proofExpiryOf(bytes32 _proof) external view returns (uint256);

    function stakedOf(bytes32 _proof) external view returns (uint256);

    function customBoosterWeights(uint256 _projectId, address _bluechip)
        external
        view
        returns (uint256);

    function customMultiplierOf(uint256 _projectId, address _bluechip)
        external
        view
        returns (uint16);

    function createCustomBooster(
        uint256 _projectId,
        address[] memory _bluechips,
        uint16[] memory _multipers
    ) external;

    function createProof(address _bluechip, uint256 _tokenId) external payable;

    function createCustomProof(
        address _bluechip,
        uint256 _tokenId,
        uint256 _projectId
    ) external payable;

    function challengeProof(address _bluechip, uint256 _tokenId) external;

    function challengeCustomProof(
        address _bluechip,
        uint256 _tokenId,
        uint256 _projectId
    ) external;

    function renewProof(address _bluechip, uint256 _tokenId) external;

    function renewCustomProof(
        address _bluechip,
        uint256 _tokenId,
        uint256 _projectId
    ) external;

    function redeemProof(address _bluechip, uint256 _tokenId) external;

    function redeemCustomProof(
        address _bluechip,
        uint256 _tokenId,
        uint256 _projectId
    ) external;

    function addBlueChip(address _bluechip, uint16 _multiper) external;
}
