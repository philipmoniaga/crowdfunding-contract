// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IConfigStore {
    event SetBaseURI(string uri);

    event SetBaseContractURI(string uri);

    event SetSigner(address signer);

    function baseURI() external view returns (string memory);

    function baseContractURI() external view returns (string memory);

    function signer() external view returns (address);

    function setBaseURI(string memory _uri) external;

    function setBaseContractURI(string memory _uri) external;

    function setSigner(address _signer) external;
}
