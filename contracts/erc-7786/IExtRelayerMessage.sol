// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IExtRelayerMessage {

	/**
	 * @dev Hook that is called before any token transfer
	 * @param payload payload
	 */
	function _afterMessageReceived(bytes memory payload) external;
		
}