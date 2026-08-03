// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title IERC7786Recipient
 * @dev Recipient interface adapted to match the binary address format parameters.
 */
interface IERC7786Recipient {

	function receiveMessage(
			bytes32 sendId,
			bytes calldata sender,
			bytes calldata payload
	) external returns (bytes4);

  event MessageReceived(bytes32 indexed sendId, address indexed sender, bytes payload);

}