// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IERC7786Recipient {
	function receiveMessage(
			bytes32 receiveId,     // Unique identifier
			bytes calldata sender, // Binary Interoperable Address
			bytes calldata payload
	) external payable returns (bytes4);
}