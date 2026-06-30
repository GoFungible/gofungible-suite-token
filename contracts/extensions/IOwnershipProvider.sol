// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IOwnershipProvider {

    /**
     * @dev Updates owner
     * @param _newOwner Address of the previous owner
     * @return newOwner Address of the new owner
     */
    function transferOwnership(address _oldOwner, address _newOwner) external returns (address);
		
}