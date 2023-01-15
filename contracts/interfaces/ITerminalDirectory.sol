// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./ITerminal.sol";
import "./IProjects.sol";

interface ITerminalDirectory {
    event SetTerminal(
        uint256 indexed projectId,
        ITerminal indexed terminal,
        address caller
    );

    error ZeroAddress();
    error UnAuthorized();
    error UnknowTerminal();

    function projects() external view returns (IProjects);

    function terminalOf(uint256 _projectId) external view returns (ITerminal);

    function setTerminal(uint256 _projectId, ITerminal _terminal) external;
}
