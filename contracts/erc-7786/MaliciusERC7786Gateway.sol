// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../erc-7786/IERC7786GatewaySource.sol";
import "../erc-7786/IERC7786Recipient.sol";
import "./IGatewayReceiver.sol";

contract MaliciusERC7786Gateway is IERC7786GatewaySource, IGatewayReceiver {

	function sendMessage(
			bytes calldata recipient, // Binary Interoperable Address
			bytes calldata payload,
			bytes[] calldata attributes
	) external payable returns (bytes32 sendId) {

	}

	function supportsAttribute(bytes4 selector) external view returns (bool) {

	}

	/**
	 * @notice Entrypoint invoked by your off-chain Ethers.js relayer script.
	 */
	function sendRelayerMessageToToken(bytes32 sendId, bytes memory sender, bytes memory recipient, bytes memory payload, uint256 value, bytes[] memory attributes) external returns (bytes4) {


		// Execute push delivery to the recipient target contract
		// bytes4 selector = Fungible(targetContract).receiveMessage(sourceChainId, sender, messagePayload);

	}

	function onRelayerCallback(bytes32 sendId, bytes memory senderBOA, bool wasSuccessful) external returns (bytes4) {

		// invoked by relayer

		// must call token

	}


}