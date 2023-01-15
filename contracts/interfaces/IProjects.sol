// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "./ITerminal.sol";

interface IProjects is IERC721 {
    error EmptyHandle();
    error TakenedHandle();
    error UnAuthorized();

    event Create(
        uint256 indexed projectId,
        address indexed owner,
        bytes32 handle,
        address caller
    );

    event SetHandle(uint256 indexed projectId, bytes32 indexed handle, address caller);

    event SetBaseURI(string baseURI);

    function count() external view returns (uint256);

    function handleOf(uint256 _projectId) external returns (bytes32 handle);

    function projectFor(bytes32 _handle) external returns (uint256 projectId);

    function exists(uint256 _projectId) external view returns (bool);

    function create(
        address _owner,
        bytes32 _handle,
        ITerminal _terminal
    ) external returns (uint256 id);

    function setHandle(uint256 _projectId, bytes32 _handle) external;
    
    function setBaseURI(string memory _uri) external;
}
