// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./IOwnershipProvider.sol";
import "./IExtRelayerMessage.sol";
import "./IExtRelayerSupply.sol";
import "./IExtRelayerSyncSupply.sol";
import "./IExtTransferINBlock.sol";
import "./IExtTransferINUpdate.sol";
import "./IExtTransferINLog.sol";
import "./IExtTransferOUTLog.sol";
import "./IExtTransferINBlockX.sol";
import "./IExtTransferINUpdateX.sol";
import "./IExtTransferINLogX.sol";
import "./IExtTransferOUTLogX.sol";

import "hardhat/console.sol";

/**
 * @title EntryFacet
 * @dev Example ERC20 token demonstrating _beforeTokenTransfer and _afterTokenTransfer hooks
 */
contract MockedExtension is IOwnershipProvider, 

												IExtRelayerMessage, 
												IExtRelayerSupply, 
												IExtRelayerSyncSupply,

												IExtTransferINBlock, 
												IExtTransferINLog, 
												IExtTransferINUpdate, 
												IExtTransferOUTLog,

												IExtTransferINBlockX, 
												IExtTransferINLogX, 
												IExtTransferINUpdateX, 
												IExtTransferOUTLogX {

	/**
	 * @dev Updates owner
	 * @param _newOwner Address of the previous owner
	 * @return newOwner Address of the new owner
	 */
	function transferOwnership(address _oldOwner, address _newOwner) external pure override returns (address) {
		return _newOwner;
	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param toChain Chain sending tokens to
	 * @param toAddress Address receiving tokens (address(0) for burns)
	 * @param message Message being transferred (ERC20)
	 */
	function _afterMessageReceived(uint256 toChain, address toAddress, string calldata message) external override pure{
		console.log("message received in chain", toChain);
		console.log("message received in address", toAddress);
		console.log("message received ", message);
	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param toChain Chain sending supply to.
	 * @param toAddress Address receiving tokens (address(0) for burns)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _afterSupplyReceived(uint256 toChain, address toAddress, uint256 amount) external override pure{
		console.log("supply received in chain", toChain);
		console.log("supply received in address", toAddress);
		console.log("supply received ", amount);
	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param toChain Chain syncing to
	 * @param toAddress Address receiving tokens (address(0) for burns)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _afterSyncSupplyReceived(uint256 toChain, address toAddress, uint256 amount) external override pure {
		console.log("sync supply received in chain", toChain);
		console.log("sync supply received in address", toAddress);
		console.log("sync supply received ", amount);
	}

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