// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title IERC7786Recipient
 * @dev Standard interface that the destination contract must implement to receive messages.
 */
interface IERC7786Recipient {
    function receiveMessage(
        bytes32 outboxId,
        string calldata sourceChain,
        string calldata sender,
        bytes calldata payload
    ) external returns (bytes4);
}