// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IExtRelayerMessage {

	/**
	 * @dev Hook that is called before any token transfer
	 * @param toChain Chain sending tokens to
	 * @param toAddress Address receiving tokens (address(0) for burns)
	 * @param message Message being transferred (ERC20)
	 */
	function _afterMessageReceived(uint256 toChain, address toAddress, string calldata message) external;
		
}