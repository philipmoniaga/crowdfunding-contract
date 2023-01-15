// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./ITerminalDirectory.sol";

interface ITerminalUtility {
    error UnAuthorized();

    function terminalDirectory() external view returns (ITerminalDirectory);
}
