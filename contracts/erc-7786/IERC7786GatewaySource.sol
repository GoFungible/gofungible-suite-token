// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title IERC7786GatewaySource
 * @dev Standard interface for sending cross-chain messages under ERC-7786.
 */
interface IERC7786GatewaySource {

	event MessageSent(
		bytes32 indexed sendId,
		bytes sender,    // Binary Interoperable Address
		bytes recipient, // Binary Interoperable Address
		bytes payload,
		uint256 value,
		bytes[] attributes
	);

	event Message2Sent(
		string param,
		string value
	);

	error UnsupportedAttribute(bytes4 selector);

	function supportsAttribute(bytes4 selector) external view returns (bool);

	function sendMessage(
			bytes calldata recipient, // Binary Interoperable Address
			bytes calldata payload,
			bytes[] calldata attributes
	) external payable returns (bytes32 sendId);

}