// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import {IFundingCycles} from "./interfaces/IFundingCycles.sol";
import {MembershipPass, IMembershipPass, IConfigStore} from "./MembershipPass.sol";
import {RoyaltyDistributor, IRoyaltyDistributor} from "./RoyaltyDistributor.sol";
import {TerminalUtility, ITerminalDirectory} from "./abstract/TerminalUtility.sol";
import {IMembershipPassBooth, PayInfoWithWeight, WeightInfo} from "./interfaces/IMembershipPassBooth.sol";

contract MembershipPassBooth is IMembershipPassBooth, TerminalUtility, ReentrancyGuard {
    using SafeMath for uint256;

    /*╔═════════════════════════════╗
      ║  Public Stored Properties   ║
      ╚═════════════════════════════╝*/
    mapping(uint256 => uint256) public override tierSizeOf;

    mapping(uint256 => IMembershipPass) public override membershipPassOf;

    mapping(uint256 => IRoyaltyDistributor) public override royaltyDistributorOf;

    mapping(uint256 => mapping(uint256 => uint256)) public override totalBiddingAmountBy;

    // total sqrt weight of each tiers by funding cycle
    // funding cycle id => (tier id => total sqrt weight)
    mapping(uint256 => mapping(uint256 => uint256)) public override totalSqrtWeightBy;

    // the weight details of each funding cycles by address
    // address => (funding cycyle id => (tier id => weight detail))
    mapping(address => mapping(uint256 => mapping(uint256 => WeightInfo)))
        public
        override depositedWeightBy;

    //  the claimed flag by funding cycle
    // address => (funding cycyle id =>  claimed)
    mapping(address => mapping(uint256 => bool)) public override claimedOf;

    //  the airdrop claimed flag by funding cycle
    // address => (funding cycyle id =>  claimed)
    mapping(address => mapping(uint256 => bool)) public override airdropClaimedOf;

    // funding cycyle id =>  tier id => claimed amount
    mapping(uint256 => mapping(uint256 => uint256)) public override airdropClaimedAmountOf;

    // Config store utils to store the global signer
    IConfigStore public configStore;

    IFundingCycles public fundingCycles;

    /*╔══════════════════╗
      ║   External VIEW  ║
      ╚══════════════════╝*/
    /**
        @notice
        Get allocations by funding cycle
        allocation 100000 means 0.1(10%), 1 meanss 0.000001(0.0001%), 1000000 means 1(100%)

        @param _user The address of the calling user
        @param _projectId The ID of the DAO being contribute to
        @param _fundingCycleId The funding cycle id
     */
    function getUserAllocation(
        address _user,
        uint256 _projectId,
        uint256 _fundingCycleId
    ) external view override returns (uint256[] memory _allocations) {
        _allocations = new uint256[](tierSizeOf[_projectId]);
        for (uint256 i; i < tierSizeOf[_projectId];) {
            uint256 _saleAmount = fundingCycles.getAutionedPass(_fundingCycleId, i).saleAmount;
            if (_saleAmount == 0) {
                _allocations[i] = 0;
                continue;
            }
            if (totalBiddingAmountBy[_fundingCycleId][i] > _saleAmount) {
                _allocations[i] = totalSqrtWeightBy[_fundingCycleId][i] == 0
                    ? 0
                    : depositedWeightBy[_user][_fundingCycleId][i]
                        .sqrtWeight
                        .mul(1e12)
                        .div(totalSqrtWeightBy[_fundingCycleId][i])
                        .div(1e6);
            } else {
                _allocations[i] = depositedWeightBy[_user][_fundingCycleId][i]
                    .amount
                    .mul(1e12)
                    .div(_saleAmount)
                    .div(1e6);
            }
            unchecked {
                i++;
            }
        }
    }

    /**
        @notice
        Get estimated allocations by funding cycle
        allocation 100000 means 0.1(10%), 1 meanss 0.000001(0.0001%), 1000000 means 1(100%)

        @param _projectId the project id of contribute dao
        @param _fundingCycleId the funding cycle id
        @param _weights ticket weights by tier
     */
    function getEstimatingUserAllocation(
        uint256 _projectId,
        uint256 _fundingCycleId,
        uint256[] memory _biddingAmounts,
        uint256[] memory _weights
    ) external view override returns (uint256[] memory _allocations) {
        _allocations = new uint256[](tierSizeOf[_projectId]);
        for (uint256 i; i < tierSizeOf[_projectId];) {
            uint256 _saleAmount = fundingCycles.getAutionedPass(_fundingCycleId, i).saleAmount;
            if (_saleAmount == 0) {
                _allocations[i] = 0;
                continue;
            }
            if ((totalBiddingAmountBy[_fundingCycleId][i] + _biddingAmounts[i]) > _saleAmount) {
                uint256 _sqrtedWeight = _sqrt(_weights[i]);
                _allocations[i] = _sqrtedWeight
                    .mul(1e12)
                    .div(totalSqrtWeightBy[_fundingCycleId][i] + _sqrtedWeight)
                    .div(1e6);
            } else {
                _allocations[i] = _biddingAmounts[i].mul(1e12).div(_saleAmount).div(1e6);
            }
            unchecked {
                i++;
            }
        }
    }

    /*╔═════════════════════════╗
      ║   External Transactions ║
      ╚═════════════════════════╝*/
    constructor(
        ITerminalDirectory _terminalDirectory,
        IConfigStore _configStore,
        IFundingCycles _fundingCycles
    ) TerminalUtility(_terminalDirectory) {
        configStore = _configStore;
        fundingCycles = _fundingCycles;
    }

    /**
        @notice
        Initialize the membershiopass for dao

        @param _projectId The project ID
        @param _tierFees Royalty fees
        @param _tierCapacities Total supply for each token
     */
    function issue(
        uint256 _projectId,
        uint256[] calldata _tierFees,
        uint256[] calldata _tierCapacities,
        uint256[] calldata _multipers
    ) external override onlyTerminal(_projectId) returns (address _membershipPass) {
        IRoyaltyDistributor royalty = new RoyaltyDistributor();
        MembershipPass membershipPass = new MembershipPass(
            _projectId,
            address(royalty),
            _tierFees,
            _tierCapacities,
            configStore
        );
        royaltyDistributorOf[_projectId] = royalty;
        membershipPassOf[_projectId] = membershipPass;
        tierSizeOf[_projectId] = _tierCapacities.length;
        _membershipPass = address(membershipPass);

        emit Issue(
            _projectId,
            _membershipPass,
            address(royalty),
            _tierFees,
            _tierCapacities,
            _multipers
        );
    }

    /**
        @notice
        For the contribution that user need to deposit the fund to the pool
    
        @param _projectId The project ID
        @param _fundingCycleId The funding cycle ID
        @param _from The wallet address of the contributo
        @param _payInfos The payment information for this transaction
     */
    function stake(
        uint256 _projectId,
        uint256 _fundingCycleId,
        address _from,
        PayInfoWithWeight[] memory _payInfos
    ) external override onlyTerminal(_projectId) {
        for (uint256 i; i < _payInfos.length;) {
            PayInfoWithWeight memory _payInfo = _payInfos[i];
            uint256 _baseWeight = _payInfo.amount.mul(_payInfo.weight);
            uint256 _sqrtedWeight = _sqrt(_baseWeight);
            totalSqrtWeightBy[_fundingCycleId][_payInfo.tier] += _sqrtedWeight;
            totalBiddingAmountBy[_fundingCycleId][_payInfo.tier] += _payInfo.amount;
            WeightInfo memory _weightByTier = depositedWeightBy[_from][_fundingCycleId][
                _payInfo.tier
            ];
            depositedWeightBy[_from][_fundingCycleId][_payInfo.tier] = WeightInfo({
                amount: _weightByTier.amount + _payInfo.amount,
                sqrtWeight: _weightByTier.sqrtWeight + _sqrtedWeight
            });
            unchecked {
                i++;
            }
        }
    }

    /**
        @notice
        Batch mint tickets

        @param _projectId The ID of the DAO
        @param _fundingCycleId The ID of the funding cycle period
        @param _from The wallet address of owner
        @param _amounts The payment information for this transaction
     */
    function batchMintTicket(
        uint256 _projectId,
        uint256 _fundingCycleId,
        address _from,
        uint256[] memory _amounts
    ) external override onlyTerminal(_projectId) {
        claimedOf[_from][_fundingCycleId] = true;
        uint256[] memory _tiers = new uint256[](_amounts.length);
        for (uint256 i; i < _amounts.length;) {
            _tiers[i] = i;
            unchecked {
                i++;
            }
        }
        membershipPassOf[_projectId].batchMintPassForMember(_from, _tiers, _amounts);

        emit BatchMintTicket(_from, _projectId, _tiers, _amounts);
    }

    /**
        @notice
        Batch mint special nfts for the address who have community token

        @param _projectId The ID of the DAO
        @param _fundingCycleId The ID of the funding cycle period
        @param _from The wallet address of owner
        @param _tierIds The special token ids
        @param _amounts The payment information for this transaction
     */
    function airdropBatchMintTicket(
        uint256 _projectId,
        uint256 _fundingCycleId,
        address _from,
        uint256[] memory _tierIds,
        uint256[] memory _amounts
    ) external override onlyTerminal(_projectId) {
        airdropClaimedOf[_from][_fundingCycleId] = true;
        for (uint256 i; i < _tierIds.length;) {
            airdropClaimedAmountOf[_fundingCycleId][_tierIds[i]] += _amounts[i];
            unchecked {
                i++;
            }
        }
        membershipPassOf[_projectId].batchMintPassForMember(_from, _tierIds, _amounts);

        emit AirdropBatchMintTicket(_from, _projectId, _tierIds, _amounts);
    }

    /**
        @notice
        Claim according to votes share

        @param _projectId The project ID 
        @param _merkleRootIds Merkle tree root ids
        @param _merkleProofs Merkle tree proofs
        @param _amounts Claim amounts
     */
    function claimRoyaltyFee(
        uint256 _projectId,
        uint256[] calldata _merkleRootIds,
        bytes32[][] memory _merkleProofs,
        uint256[] calldata _amounts
    ) external {
        IRoyaltyDistributor distributor = royaltyDistributorOf[_projectId];
        if (distributor == IRoyaltyDistributor(address(0))) {
            revert ProjectNotExist();
        }
        distributor.claimRoyaltyFee(msg.sender, _merkleRootIds, _merkleProofs, _amounts);

        emit ClaimRoyaltyFee(_projectId, msg.sender, _merkleRootIds, _amounts);
    }

    /**
        @notice
        Start a new distribution

        @param _projectId The project ID
        @param _distributeAmount The distribute amount of this cycle
        @param _merkleRoot Merkle tree root, record distribution amount of each member
        @param _ipfsHash The ipfs hash of merkle tree
        @param _signature The signature signed by signer
     */
    function distributeRoyaltyFee(
        uint256 _projectId,
        uint256 _distributeAmount,
        bytes32 _merkleRoot,
        string memory _ipfsHash,
        bytes memory _signature
    ) external nonReentrant {
        IRoyaltyDistributor distributor = royaltyDistributorOf[_projectId];
        if (distributor == IRoyaltyDistributor(address(0))) {
            revert ProjectNotExist();
        }
        bytes32 _hash = keccak256(
            abi.encodePacked(_projectId, "-", _ipfsHash, "-", _distributeAmount, "-", _merkleRoot)
        );
        if (ECDSA.recover(_hash, _signature) != configStore.signer()) {
            revert UnAuthorized();
        }
        uint256 _merkleRootId = distributor.distributeRoyaltyFee(_distributeAmount, _merkleRoot);

        emit DistributeRoyaltyFee(
            _projectId,
            _merkleRootId,
            _distributeAmount,
            block.timestamp,
            _ipfsHash
        );
    }

    /*╔═════════════════════════════╗
      ║   Private Helper Functions  ║
      ╚═════════════════════════════╝*/
    /**
        @notice
        Calculates the square root of x, rounding down

        @dev
        Uses the Babylonian method (https://ethereum.stackexchange.com/a/97540/37941)

        @param x The uint256 number for which to calculate the square root
        @return result The result as an uint256
     */
    function _sqrt(uint256 x) private pure returns (uint256 result) {
        if (x == 0) {
            return 0;
        }
        // Calculate the square root of the perfect square of a power of two that is the closest to x.
        uint256 xAux = uint256(x);
        result = 1;
        if (xAux >= 0x100000000000000000000000000000000) {
            xAux >>= 128;
            result <<= 64;
        }
        if (xAux >= 0x10000000000000000) {
            xAux >>= 64;
            result <<= 32;
        }
        if (xAux >= 0x100000000) {
            xAux >>= 32;
            result <<= 16;
        }
        if (xAux >= 0x10000) {
            xAux >>= 16;
            result <<= 8;
        }
        if (xAux >= 0x100) {
            xAux >>= 8;
            result <<= 4;
        }
        if (xAux >= 0x10) {
            xAux >>= 4;
            result <<= 2;
        }
        if (xAux >= 0x8) {
            result <<= 1;
        }
        // The operations can never overflow because the result is max 2^127 when it enters this block.
        unchecked {
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1;
            result = (result + x / result) >> 1; // Seven iterations should be enough
            uint256 roundedDownResult = x / result;
            return result >= roundedDownResult ? roundedDownResult : result;
        }
    }
}
