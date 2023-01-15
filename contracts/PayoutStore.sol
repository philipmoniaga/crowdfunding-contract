// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./interfaces/IPayoutStore.sol";
import "./abstract/TerminalUtility.sol";

/**
  @notice
  Stores mods for each project.
  @dev
  Mods can be used to distribute a percentage of payments or tickets to preconfigured beneficiaries.

  @notice
  the fundingCycleID is unique, then there is no need to store ProjectId in SmartContract. 
*/
contract PayoutStore is TerminalUtility, IPayoutStore {
    /*╔═════════════════════════════╗
      ║  Private Stored Properties  ║
      ╚═════════════════════════════╝*/
    // All payout mods for each fundingCycleID => payModsOf
    mapping(uint256 => PayoutMod[]) private _payoutModsOf;

    /*╔═════════════════════════════╗
      ║  Public Stored Properties   ║
      ╚═════════════════════════════╝*/
    /// @notice The contract storing project information.
    IProjects public immutable override projects;

    /*╔══════════════════╗
      ║   Public VIEW    ║
      ╚══════════════════╝*/
    /**
      @notice 
      Get all payout mods for the specified project ID.
      @param _fundingCycleId The ID of the fundingCycle to get mods for.
      @return An array of all mods for the project.
     */
    function payoutModsOf(uint256 _fundingCycleId)
        external
        view
        override
        returns (PayoutMod[] memory)
    {
        return _payoutModsOf[_fundingCycleId];
    }

    /*╔═════════════════════════╗
      ║   External Transactions ║
      ╚═════════════════════════╝*/
    /** 
      @param _projects The contract storing project information
      @param _terminalDirectory A directory of a project's current Juicebox terminal to receive payments in.
    */
    constructor(IProjects _projects, ITerminalDirectory _terminalDirectory)
        TerminalUtility(_terminalDirectory)
    {
        projects = _projects;
    }

    /** 
      @notice 
      Adds a mod to the payout mods list.
      @dev
      Only the owner or operator of a project can make this call, or the current terminal of the project.
      @param _projectId The project to add a mod to.
      @param _mods The payout mods to set.
    */
    function setPayoutMods(
        uint256 _projectId,
        uint256 _fundingCycleId,
        PayoutMod[] memory _mods
    ) external override onlyTerminal(_projectId) {
        // There must be something to do.
        if (_mods.length <= 0) {
            revert NoOp();
        }

        // Delete from storage so mods can be repopulated.
        delete _payoutModsOf[_fundingCycleId];

        // Add up all the percents to make sure they cumulative are under 100%.
        uint256 _payoutModPercentTotal;

        for (uint256 _i; _i < _mods.length;) {
            // The percent should be greater than 0.
            if (_mods[_i].percent < 0) revert BadPercentage();

            // Add to the total percents.
            _payoutModPercentTotal = _payoutModPercentTotal + _mods[_i].percent;

            // The total percent should be less than 10000.
            if (_payoutModPercentTotal > 10000) revert BadTotalPercentage();

            // The allocator and the beneficiary shouldn't both be the zero address.
            if (_mods[_i].beneficiary == address(0)) revert BadAddress();

            // Push the new mod into the project's list of mods.
            _payoutModsOf[_fundingCycleId].push(_mods[_i]);

            emit SetPayoutMod(_projectId, _fundingCycleId, _mods[_i], msg.sender);
        
            unchecked {
                _i++;
            }
        }
    }
}
