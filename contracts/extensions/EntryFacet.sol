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

/**
 * @title EntryFacet
 * @dev Example ERC20 token demonstrating _beforeTokenTransfer and _afterTokenTransfer hooks
 */
contract EntryFacet is 	IOwnershipProvider, 

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
	function transferOwnership(address _oldOwner, address _newOwner) external override returns (address) {

	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param toChain Chain sending tokens to
	 * @param toAddress Address receiving tokens (address(0) for burns)
	 * @param message Message being transferred (ERC20)
	 */
	function _afterMessageReceived(uint256 toChain, address toAddress, string calldata message) external override returns (bool) {

	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param toChain Chain sending supply to.
	 * @param toAddress Address receiving tokens (address(0) for burns)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _afterSupplyReceived(uint256 toChain, address toAddress, uint256 amount) external override returns (bool) {

	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param toChain Chain syncing to
	 * @param toAddress Address receiving tokens (address(0) for burns)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _afterSyncSupplyReceived(uint256 toChain, address toAddress, uint256 amount) external override returns (bool) {

	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param from Address sending tokens (address(0) for mints)
	 * @param to Address receiving tokens (address(0) for burns)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _beforeTokenTransferBlock(address from, address to, uint256 amount) external override returns (bool) {

	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param from Address sending tokens (address(0) for mints)
	 * @param to Address receiving tokens (address(0) for burns)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _beforeTokenTransferLog(address from, address to, uint256 amount) external override {

	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param from Address sending tokens (address(0) for mints)
	 * @param to Address receiving tokens (address(0) for burns)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _beforeTokenTransferUpdate(address from, address to, uint256 amount) external override returns (uint256) {
		
	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param from Address sending tokens (address(0) for mints)
	 * @param to Address receiving tokens (address(0) for burns)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _afterTokenTransfer(address from, address to, uint256 amount) external override {

	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param toChain Address receiving tokens (address(0) for burns)
	 * @param toAddress Address sending tokens (address(0) for mints)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _beforeTokenTransferBlock(uint256 toChain, address toAddress, uint256 amount) external override returns (bool) {

	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param toChain Address receiving tokens (address(0) for burns)
	 * @param toAddress Address sending tokens (address(0) for mints)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _beforeTokenTransferLog(uint256 toChain, address toAddress, uint256 amount) external override {

	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param toChain Address receiving tokens (address(0) for burns)
	 * @param toAddress Address sending tokens (address(0) for mints)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _beforeTokenTransferUpdate(uint256 toChain, address toAddress, uint256 amount) external override returns (uint256) {

	}

	/**
	 * @dev Hook that is called before any token transfer
	 * @param toChain Address receiving tokens (address(0) for burns)
	 * @param toAddress Address sending tokens (address(0) for mints)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _afterTokenTransfer(uint256 toChain, address toAddress, uint256 amount) external override {

	}

}