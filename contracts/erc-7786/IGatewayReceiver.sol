// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title IERC7786GatewaySource
 * @dev Standard interface for sending cross-chain messages under ERC-7786.
 */
interface IGatewayReceiver {

	/**
	 * @notice Entrypoint invoked by your off-chain Ethers.js relayer script.
	 */
	function sendRelayerMessageToToken(bytes32 sendId, bytes memory sender, bytes memory recipient, bytes memory payload, uint256 value, bytes[] memory attributes) external returns (bytes4);

	/**
	 * @notice Entrypoint invoked by your off-chain Ethers.js relayer script.
	 */
	function onRelayerCallback(bytes32 sendId, bytes memory senderBOA, bytes4 selectorIfError) external returns (bytes4);
		
}