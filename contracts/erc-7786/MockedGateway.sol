// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../erc-7786/IERC7786GatewaySource.sol";

contract MockedGateway is IERC7786GatewaySource {

	function sendMessage(
			string calldata destinationChain, // CAIP-2 chain identifier
			string calldata receiver, // CAIP-10 account address
			bytes calldata payload,
			bytes[] calldata attributes
	) external payable override returns (bytes32 outboxId) {

	}

	function supportsAttribute(bytes4 selector) external view override returns (bool) {

	}

}