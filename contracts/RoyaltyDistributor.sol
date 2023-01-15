// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

import {IConfigStore} from "./interfaces/IConfigStore.sol";
import {IRoyaltyDistributor} from "./interfaces/IRoyaltyDistributor.sol";

contract RoyaltyDistributor is Ownable, IRoyaltyDistributor, ReentrancyGuard {
    /*╔═════════════════════════════╗
      ║   Private Stored Properties ║
      ╚═════════════════════════════╝*/
    uint256 private _distributedBalance;

    /*╔═════════════════════════════╗
      ║  Public Stored Properties   ║
      ╚═════════════════════════════╝*/

    uint256 public merkleRootCount;

    mapping(uint256 => bytes32) public merkleRootOf;

    mapping(bytes32 => bool) public merkleRootFor;

    mapping(address => mapping(uint256 => bool)) public claimedOf;

    /*╔══════════════════╗
      ║   External VIEW  ║
      ╚══════════════════╝*/

    /**
        @notice
        The pending distributed royalty fees since last distribution
     */
    function pendingBalance() public view returns (uint256) {
        return address(this).balance - _distributedBalance;
    }

    /*╔═════════════════════════╗
      ║   External Transaction  ║
      ╚═════════════════════════╝*/

    constructor() {}

    /**
        @notice
        Claim according to votes share

        @param _from The beneficiary
        @param _merkleRootIds Merkle tree root ids
        @param _merkleProofs Merkle tree proofs
        @param _amounts Claim amounts
     */
    function claimRoyaltyFee(
        address _from,
        uint256[] calldata _merkleRootIds,
        bytes32[][] memory _merkleProofs,
        uint256[] calldata _amounts
    ) public override onlyOwner nonReentrant {
        uint256 _totalAmount;
        if (_merkleRootIds.length != _merkleProofs.length || _merkleRootIds.length != _amounts.length) {
            revert SizeNotMatch();
        }
        for (uint256 i; i < _merkleRootIds.length;) {
            uint256 _rootId = _merkleRootIds[i];
            bytes32 _node = keccak256(abi.encodePacked(_rootId, "-", _from, "-", _amounts[i]));
            bytes32 _merkleRoot = merkleRootOf[_rootId];
            if (!MerkleProof.verify(_merkleProofs[i], _merkleRoot, _node)) {
                revert UnAuthorized();
            }
            if (claimedOf[_from][_rootId]) {
                revert AlreadyClaimed();
            }
            _totalAmount += _amounts[i];
            claimedOf[_from][_rootId] = true;
            unchecked {
                i++;
            }
        }

        Address.sendValue(payable(_from), _totalAmount);
    }

    /**
        @notice
        Start a new distribution

        @param _distributeAmount The distribute amount of this cycle
        @param _merkleRoot Merkle tree root, record distribution amount of each member
     */
    function distributeRoyaltyFee(uint256 _distributeAmount, bytes32 _merkleRoot)
        public
        override
        onlyOwner
        returns (uint256 _rootId)
    {
        if (merkleRootFor[_merkleRoot]) revert MerkleRootExist();
        if (_distributeAmount > pendingBalance()) revert BadBalance();

        unchecked {
            merkleRootCount++;
        }

        merkleRootFor[_merkleRoot] = true;
        merkleRootOf[merkleRootCount] = _merkleRoot;
        _distributedBalance += _distributeAmount;

        _rootId = merkleRootCount;
    }
}
