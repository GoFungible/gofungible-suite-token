// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./IOwnershipProvider.sol";

import "hardhat/console.sol";

/**
 * @title EntryFacet
 * @dev Example ERC20 token demonstrating _beforeTokenTransfer and _afterTokenTransfer hooks
 */
contract MaliciousAccessExtension is IOwnershipProvider {

	/**
	 * @dev Updates owner
	 * @param _newOwner Address of the previous owner
	 * @return newOwner Address of the new owner
	 */
	function transferOwnership(address _oldOwner, address _newOwner) external pure override returns (address) {
		return _newOwner;
	}

}