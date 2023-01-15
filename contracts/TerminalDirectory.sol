// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {ITerminal} from "./interfaces/ITerminal.sol";
import {IProjects} from "./interfaces/IProjects.sol";
import {ITerminalDirectory} from "./interfaces/ITerminalDirectory.sol";

/**
  @notice
  Allows project owners to deploy proxy contracts that can pay them when receiving funds directly.
*/
contract TerminalDirectory is ITerminalDirectory {
    // --- public immutable stored properties --- //

    // The Projects contract which mints ERC-721's that represent project ownership and transfers.
    IProjects public immutable override projects;

    /*╔═════════════════════════════╗
      ║    Public Stored Constants  ║
      ╚═════════════════════════════╝*/
    // The terminal of each project
    mapping(uint256 => ITerminal) public override terminalOf;

    /**
      @param _projects A Projects contract which mints ERC-721's that represent project ownership and transfers.
    */
    constructor(IProjects _projects) {
        projects = _projects;
    }

    /*╔═════════════════════════╗
      ║   External Transaction  ║
      ╚═════════════════════════╝*/
    /** 
      @notice
      Update the terminal

      @param _projectId The ID of the project to set a new terminal for.
      @param _terminal The new terminal to set.
    */
    function setTerminal(uint256 _projectId, ITerminal _terminal) external override {
        // Get a reference to the current terminal being used.
        ITerminal _currentTerminal = terminalOf[_projectId];

        // Either:
        // - case 1: the current terminal hasn't been set yet and the msg sender is either the projects contract or the terminal being set.
        // - case 2: the current terminal must not yet be set, or the current terminal is setting a new terminal.
        require(
            // case 1.
            (_currentTerminal == ITerminal(address(0)) &&
                (msg.sender == address(projects) || msg.sender == address(_terminal))) ||
                // case 2.
                msg.sender == address(_currentTerminal),
            "TerminalDirectory::setTerminal: UNAUTHORIZED"
        );

        // The project must exist.
        if (!projects.exists(_projectId)) revert UnknowTerminal();

        // Can't set the zero address.
        if (_terminal == ITerminal(address(0))) revert ZeroAddress();

        // If the terminal is already set, nothing to do.
        if (_currentTerminal == _terminal) return;

        // Set the new terminal.
        terminalOf[_projectId] = _terminal;

        emit SetTerminal(_projectId, _terminal, msg.sender);
    }
}
