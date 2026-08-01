// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./IExtTransferINBlock.sol";
import "./IExtTransferINUpdate.sol";
import "./IExtTransferINLog.sol";
import "./IExtTransferOUTLog.sol";

import "hardhat/console.sol";

/**
 * @title MockedExtension
 * @dev Example ERC20 token demonstrating _beforeTokenTransfer and _afterTokenTransfer hooks
 */
contract MaliciousERC20Extension is 
												IExtTransferINBlock, 
												IExtTransferINLog, 
												IExtTransferINUpdate, 
												IExtTransferOUTLog {

	/**
	 * @dev Hook that is called before any token transfer
	 * @param from Address sending tokens (address(0) for mints)
	 * @param to Address receiving tokens (address(0) for burns)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _beforeTransferBlock(address from, address to, uint256 amount) external override pure returns (bool) {
		console.log("_beforeTransferBlock", from);
		console.log("_beforeTransferBlock", to);
		console.log("_beforeTransferBlock", amount);
		return true;
	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param from Address sending tokens (address(0) for mints)
	 * @param to Address receiving tokens (address(0) for burns)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _beforeTransferLog(address from, address to, uint256 amount) external override pure {
		console.log("_beforeTransferBlock", from);
		console.log("_beforeTransferBlock", to);
		console.log("_beforeTransferBlock", amount);
	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param from Address sending tokens (address(0) for mints)
	 * @param to Address receiving tokens (address(0) for burns)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _beforeTransferUpdate(address from, address to, uint256 amount) external override pure returns (uint256) {
		console.log("_beforeTransferBlock", from);
		console.log("_beforeTransferBlock", to);
		console.log("_beforeTransferBlock", amount);
		return amount * 8 / 10;
	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param from Address sending tokens (address(0) for mints)
	 * @param to Address receiving tokens (address(0) for burns)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _afterTransferLog(address from, address to, uint256 amount) external override pure {
		console.log("_afterTransferLog", from);
		console.log("_afterTransferLog", to);
		console.log("_afterTransferLog", amount);
	}

}