// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IExtRelayerSyncSupply {

	/**
	 * @dev Hook that is called before any token transfer
	 * @param toChain Chain syncing to
	 * @param toAddress Address receiving tokens (address(0) for burns)
	 * @param amount Amount of tokens being transferred (ERC20)
	 */
	function _afterSyncSupplyReceived(uint256 toChain, address toAddress, uint256 amount) external;
		
}