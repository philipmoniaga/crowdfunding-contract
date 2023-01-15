// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

import {IMembershipPass, IConfigStore} from "./interfaces/IMembershipPass.sol";

contract MembershipPass is IMembershipPass, ERC1155, Ownable {
    using Strings for uint256;
    using SafeMath for uint256;

    /*╔═════════════════════════════╗
      ║   Private Stored Constants  ║
      ╚═════════════════════════════╝*/
    uint256 private immutable _projectId;

    // the maximum royalty fee 10%
    uint256 private constant MAX_ROYALTY_FEE = 1000;

    /*╔═════════════════════════════╗
      ║  Public Stored Properties   ║
      ╚═════════════════════════════╝*/
    // Tier capacity is zero-indexed
    mapping(uint256 => uint256) public tierCapacity;

    // Supplied amount by tier
    mapping(uint256 => uint256) public supplyByTier;

    // Royalty fee
    mapping(uint256 => uint256) public tierFee;

    // Fee collector to receive royalty fees
    address public override feeCollector;

    // Config store utils to store the global basic uris
    IConfigStore public override configStore;

    /*╔══════════════════╗
      ║   External VIEW  ║
      ╚══════════════════╝*/
    /**
        @notice
        Implement ERC2981, but actually the most marketplaces have their own royalty logic. Only LooksRare

        @param _tier The token ID of current saled item
        @param _salePrice The Sale price of current saled item
     */
    function royaltyInfo(uint256 _tier, uint256 _salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        return (feeCollector, _salePrice.mul(tierFee[_tier]).div(10000));
    }

    function uri(uint256 _tokenId) public view override returns (string memory) {
        string memory _baseURI = configStore.baseURI();

        return
            bytes(_baseURI).length > 0
                ? string(
                    abi.encodePacked(_baseURI, _projectId.toString(), "/", _tokenId.toString())
                )
                : "";
    }

    /**
        @notice
        Return the contract-level metadata for opensea
        https://docs.opensea.io/docs/contract-level-metadata
     */
    function contractURI() public view returns (string memory) {
        string memory _baseContractURI = configStore.baseContractURI();

        return
            bytes(_baseContractURI).length > 0
                ? string(abi.encodePacked(_baseContractURI, _projectId.toString()))
                : "";
    }

    /**
        @notice
        Get remaining amount of giving toke id

        @dev
        RemainingAmount = capacity - supply    TODO: 還需要把社區 airdrop 票算進去

        @param _tier The token id
     */
    function getRemainingAmount(uint256 _tier) public view returns (uint256 _remainingAmount) {
        _remainingAmount = tierCapacity[_tier] - supplyByTier[_tier];
    }

    /*╔═════════════════════════╗
      ║   External Transaction  ║
      ╚═════════════════════════╝*/
    constructor(
        uint256 _daoId,
        address _feeCollector,
        uint256[] memory _tierFees,
        uint256[] memory _tierCapacities,
        IConfigStore _configStore
    ) ERC1155("") {
        if (_tierFees.length == 0) revert TierNotSet();
        if (_configStore == IConfigStore(address(0))) revert TierUnknow();
        uint256 _tier;
        for (uint256 i; i < _tierFees.length;) {
            if (_tierCapacities[i] == 0) revert BadCapacity();
            if (_tierFees[i] > MAX_ROYALTY_FEE) revert BadFee();
            tierFee[_tier] = _tierFees[i];
            tierCapacity[_tier] = _tierCapacities[i];
            unchecked {
                _tier ++;
                i++;
            }
        }

        _projectId = _daoId;
        configStore = _configStore;
        feeCollector = _feeCollector;
    }

    /**
        @notice
        Mint token to giving address

        @param _recepient The recepient to be mint tokens
        @param _tier The token id
        @param _amount The amount to be mint
     */
    function mintPassForMember(
        address _recepient,
        uint256 _tier,
        uint256 _amount
    ) external override onlyOwner {
        if (tierCapacity[_tier] == 0) revert TierUnknow();
        if (_amount > getRemainingAmount(_tier)) revert InsufficientBalance();

        supplyByTier[_tier] = supplyByTier[_tier].add(_amount);
        _mint(_recepient, _tier, _amount, "");

        emit MintPass(_recepient, _tier, _amount);
    }

    /**
        @notice
        Batch mint tokens to giving address

        @param _recepient The recepient to be mint tokens
        @param _tiers The token ids
        @param _amounts The amounts to be mint
     */
    function batchMintPassForMember(
        address _recepient,
        uint256[] memory _tiers,
        uint256[] memory _amounts
    ) external override onlyOwner {
        for (uint256 i; i < _tiers.length;) {
            uint256 _tier = _tiers[i];
            if (tierCapacity[_tier] == 0) revert TierUnknow();
            if (_amounts[i] > getRemainingAmount(_tier)) revert InsufficientBalance();

            supplyByTier[_tier] += _amounts[i];
    
            unchecked {
                i++;
            }
        }
        _mintBatch(_recepient, _tiers, _amounts, "");

        emit BatchMintPass(_recepient, _tiers, _amounts);
    }

    /**
        @notice
        The owner can update the fee collector address

        @dev
        Only owner have access to operate

        @param _feeCollector The new fee collector
     */
    function updateFeeCollector(address _feeCollector) external override onlyOwner {
        feeCollector = _feeCollector;
    }
}
