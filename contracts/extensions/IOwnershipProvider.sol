// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IOwnershipProvider {

    /**
     * @dev Updates owner
     * @param oldOwner Address of the previous owner
     * @return newOwner Address of the new owner
     */
    function _updateOwner(address oldOwner) external returns (address);
		
}