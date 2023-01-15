// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import {IProjects, ITerminal} from "./interfaces/IProjects.sol";

/**
  @notice
  Each DAO has one owner who is the owner of this ERC721.
 */
contract Projects is IProjects, ERC721, Ownable {
    /*╔═════════════════════════════╗
      ║   Private Stored Constants  ║
      ╚═════════════════════════════╝*/
    string private _baseURIextended;

    /*╔═════════════════════════════╗
      ║  Public Stored Properties   ║
      ╚═════════════════════════════╝*/
    // @notice A running count of project IDs.
    uint256 public override count;

    // @notice Each project's handle.
    mapping(uint256 => bytes32) public override handleOf;

    // @notice The project that each unique handle represents.
    mapping(bytes32 => uint256) public override projectFor;

    /*╔═══════════════════════════╗
        ║         MODIFIERS         ║
        ╚═══════════════════════════╝*/
    modifier onlyProjectOwner(uint256 _projectId) {
        if (msg.sender != ownerOf(_projectId)) revert UnAuthorized();
        _;
    }

    /*╔═════════════════════════════╗
    ║  INTERNAL HELPER FUNCTIONS  ║
    ╚═════════════════════════════╝*/
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseURIextended;
    }

    /*╔══════════════════╗
      ║   External VIEW  ║
      ╚══════════════════╝*/
    /**
        @notice
        Whether the specified project exists
    
        @param _projectId The project to check the existence of
        @return A flag indicating if the project exists
     */
    function exists(uint256 _projectId) external view override returns (bool) {
        return _exists(_projectId);
    }

    /*╔═════════════════════════╗
      ║   External Transaction  ║
      ╚═════════════════════════╝*/
    constructor(address _superAdmin) ERC721("Neighborhood project", "NEIGHHORHOOD PROJECT") {
        transferOwnership(_superAdmin);
    }

    /**
        @notice
        Create a new project

        @param _owner The owner of the project
        @param _handle A unique handle for the project
        @param _terminal The terminal to set for this project
     */
    function create(
        address _owner,
        bytes32 _handle,
        ITerminal _terminal
    ) external override returns (uint256) {
        // Handle must exist.
        if (_handle == bytes32(0)) revert EmptyHandle();

        // Handle must be unique.
        if (projectFor[_handle] != 0) revert TakenedHandle();

        // Increment the count, which will be used as the ID.
        count++;

        // Mint the project.
        _safeMint(_owner, count);

        // Set the handle stored values.
        handleOf[count] = _handle;
        projectFor[_handle] = count;

        // Set the project's terminal if needed.
        if (_terminal != ITerminal(address(0)))
            _terminal.terminalDirectory().setTerminal(count, _terminal);

        emit Create(count, _owner, _handle, msg.sender);

        return count;
    }

    /**
        @notice
        Allows a project owner to set the project's handle

        @dev
        Only a project's owner or operator can set its handle

        @param _projectId The ID of the project
        @param _handle The new unique handle for the project
     */
    function setHandle(uint256 _projectId, bytes32 _handle)
        external
        override
        onlyProjectOwner(_projectId)
    {
        // Handle must exist.
        if (_handle == bytes32(0)) revert EmptyHandle();
        // Handle must be unique.
        if (projectFor[_handle] != 0) revert TakenedHandle();

        // Register the change in the resolver.
        projectFor[handleOf[_projectId]] = 0;

        projectFor[_handle] = _projectId;
        handleOf[_projectId] = _handle;

        emit SetHandle(_projectId, _handle, msg.sender);
    }

    function setBaseURI(string memory _uri) external override onlyOwner {
        _baseURIextended = _uri;

        emit SetBaseURI(_uri);
    }
}
