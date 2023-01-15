// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../interfaces/ITerminalUtility.sol";

abstract contract TerminalUtility is ITerminalUtility {
    modifier onlyTerminal(uint256 _projectId) {
        if (address(terminalDirectory.terminalOf(_projectId)) != msg.sender) revert UnAuthorized();
        _;
    }

    ITerminalDirectory public immutable override terminalDirectory;

    /** 
      @param _terminalDirectory A directory of a project's current terminal to receive payments in.
    */
    constructor(ITerminalDirectory _terminalDirectory) {
        terminalDirectory = _terminalDirectory;
    }
}
