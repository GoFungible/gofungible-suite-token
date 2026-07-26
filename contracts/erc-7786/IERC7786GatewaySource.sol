// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IERC7786GatewaySource {

	event MessageSent(
		bytes32 indexed sendId,
		bytes sender,    // Binary Interoperable Address
		bytes recipient, // Binary Interoperable Address
		bytes payload,
		uint256 value,
		bytes[] attributes
	);

	error UnsupportedAttribute(bytes4 selector);

	function supportsAttribute(bytes4 selector) external view returns (bool);

	function sendMessage(
			string calldata destinationChain, // CAIP-2 chain identifier
			string calldata receiver, // CAIP-10 account address
			bytes calldata payload,
			bytes[] calldata attributes
	) external payable returns (bytes32 outboxId);

	/*function sendMessage(
			bytes calldata recipient, // Binary Interoperable Address
			bytes calldata payload,
			bytes[] calldata attributes
	) external payable returns (bytes32 sendId);*/
	
}
