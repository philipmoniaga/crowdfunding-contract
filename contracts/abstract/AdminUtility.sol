// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

abstract contract AdminUtility {
    address public superAdmin;

    error NotAdmin();

    modifier onlyAdmin() {
        if (msg.sender != superAdmin) revert NotAdmin();
        _;
    }

    constructor(address _superAdmin) {
        superAdmin = _superAdmin;
    }
}
