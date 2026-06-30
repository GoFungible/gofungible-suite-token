// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// @title ERC-173 Contract Ownership Standard
// Note: the ERC-165 identifier for this interface is 0x7f5828d0
// https://eips.ethereum.org/EIPS/eip-173
interface ERC173 {

    /// @dev This emits when ownership of a contract changes.    
    event OwnershipTransferred(address indexed oldOwner, address indexed _owner);

    /// @notice Get the address of the owner    
    /// @return The address of the owner.
    function owner() view external returns(address);
	
    /// @notice Set the address of the new owner of the contract
    /// @dev Set _newOwner to address(0) to renounce any ownership.
    /// @param _newOwner The address of the new owner of the contract    
    function transferOwnership(address _newOwner) external;	
}