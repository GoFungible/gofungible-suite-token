// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./IExtTransferINBlockX.sol";
import "./IExtTransferINUpdateX.sol";
import "./IExtTransferINLogX.sol";
import "./IExtTransferOUTLogX.sol";

import "hardhat/console.sol";

/**
 * @title MockedERC20nExtension
 * @dev Example ERC20 token demonstrating _beforeTokenTransfer and _afterTokenTransfer hooks
 */
contract MockedERC20nExtension is 
												IExtTransferINBlockX, 
												IExtTransferINLogX, 
												IExtTransferINUpdateX, 
												IExtTransferOUTLogX {

	/**
	 * @dev Hook that is called before any token transfer
	 * @param toChain Address receiving tokens (address(0) for burns)
	 * @param toAddress Address sending tokens (address(0) for mints)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _beforeTransferBlock(uint256 toChain, address toAddress, uint256 amount) external override pure returns (bool) {
		console.log("toChain", toChain);
		console.log("toAddress", toAddress);
		console.log("amount", amount);
		return true;
	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param toChain Address receiving tokens (address(0) for burns)
	 * @param toAddress Address sending tokens (address(0) for mints)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _beforeTransferLog(uint256 toChain, address toAddress, uint256 amount) external override pure {
		console.log("toChain", toChain);
		console.log("toAddress", toAddress);
		console.log("amount", amount);
	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param toChain Address receiving tokens (address(0) for burns)
	 * @param toAddress Address sending tokens (address(0) for mints)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _beforeTransferUpdate(uint256 toChain, address toAddress, uint256 amount) external override pure returns (uint256) {
		console.log("toChain", toChain);
		console.log("toAddress", toAddress);
		console.log("_beforeTransferBlock", amount);
		return amount * 8 / 10;
	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param toChain Address receiving tokens (address(0) for burns)
	 * @param toAddress Address sending tokens (address(0) for mints)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _afterTransferLog(uint256 toChain, address toAddress, uint256 amount) external override pure {
		console.log("toChain", toChain);
		console.log("toAddress", toAddress);
		console.log("amount", amount);
	}

}