// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../erc-7786/IERC7786GatewaySource.sol";
import "../erc-7786/IERC7786Recipient.sol";

contract MaliciusERC7786Gateway is IERC7786GatewaySource {

	function sendMessage(
			bytes calldata recipient, // Binary Interoperable Address
			bytes calldata payload,
			bytes[] calldata attributes
	) external payable returns (bytes32 sendId) {

	}

	function supportsAttribute(bytes4 selector) external view returns (bool) {

	}

}