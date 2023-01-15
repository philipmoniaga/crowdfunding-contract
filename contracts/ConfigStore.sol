// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IConfigStore.sol";

/**
  @notice
  Stores configuration globally
  @dev
  Uris is used as base uri of membership pass
*/
contract ConfigStore is IConfigStore, Ownable {
    /*╔═════════════════════════════╗
      ║  Public Stored Properties   ║
      ╚═════════════════════════════╝*/

    // The base uri of metadata for membershippass nft
    string public override baseURI;

    // Contract level data, for intergrating the NFT to OpenSea
    string public override baseContractURI;

    // Signer address, sign proposal and royalty fee distribution merkle tree
    address public override signer;

    /*╔═════════════════════════╗
      ║   External Transaction  ║
      ╚═════════════════════════╝*/

    constructor(
        string memory _baseURI,
        string memory _baseContractURI,
        address _signer
    ) {
        baseURI = _baseURI;
        baseContractURI = _baseContractURI;
        signer = _signer;
    }

    /**
        @notice
        The owner can modify the base uri

        @param _uri The new base uri
     */
    function setBaseURI(string memory _uri) external override onlyOwner {
        baseURI = _uri;

        emit SetBaseURI(_uri);
    }

    /**
        @notice
        The owner can modify the base contract uri
        
        @param _uri The new base contract uri
     */
    function setBaseContractURI(string memory _uri) external override onlyOwner {
        baseContractURI = _uri;

        emit SetBaseContractURI(_uri);
    }

    /**
        @notice
        The owner can modify the signer
        
        @param _signer The new signer
     */
    function setSigner(address _signer) external override onlyOwner {
        signer = _signer;

        emit SetSigner(_signer);
    }
}
