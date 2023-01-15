// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./IProjects.sol";

struct PayoutMod {
    uint16 percent;
    address payable beneficiary;
}


interface IPayoutStore {

    error BadPercentage();
    error BadTotalPercentage();
    error BadAddress();
    error NoOp();

    event SetPayoutMod(
        uint256 indexed projectId,
        uint256 indexed fundingCycleId,
        PayoutMod mod,
        address caller
    );

    function projects() external view returns (IProjects);

    function payoutModsOf(uint256 _fundingCycleId)
        external
        view
        returns (PayoutMod[] memory);

    function setPayoutMods(
        uint256 _projectId,
        uint256 _fundingCycleId,
        PayoutMod[] memory _mods
    ) external;

}