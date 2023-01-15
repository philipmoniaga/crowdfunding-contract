// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

import "./IConfigStore.sol";

interface IMembershipPass is IERC1155, IERC2981 {
    event MintPass(address indexed recepient, uint256 indexed tier, uint256 amount);

    event BatchMintPass(address indexed recepient, uint256[] tiers, uint256[] amounts);

    error TierNotSet();
    error TierUnknow();
    error BadCapacity();
    error BadFee();
    error InsufficientBalance();

    function feeCollector() external view returns (address);

    function configStore() external view returns (IConfigStore);

    /**
     * @notice
     * Implement ERC2981, but actually the most marketplaces have their own royalty logic
     */
    function royaltyInfo(uint256 _tier, uint256 _salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount);

    function mintPassForMember(
        address _recepient,
        uint256 _token,
        uint256 _amount
    ) external;

    function batchMintPassForMember(
        address _recepient,
        uint256[] memory _tokens,
        uint256[] memory _amounts
    ) external;

    function updateFeeCollector(address _feeCollector) external;
}
