// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IRoyaltyDistributor {
    error UnAuthorized();
    error MerkleRootExist();
    error BadBalance();
    error AlreadyClaimed();
    error SizeNotMatch();

    function claimRoyaltyFee(
        address _from,
        uint256[] calldata _merkleRootIds,
        bytes32[][] memory _merkleProofs,
        uint256[] calldata _amounts
    ) external;

    function distributeRoyaltyFee(uint256 _distributeAmount, bytes32 _merkleRoot)
        external
        returns (uint256);
}
