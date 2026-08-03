// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title IERC7786GatewaySource
 * @dev Standard interface for sending cross-chain messages under ERC-7786.
 */
interface IERC7786GatewaySource {
    event MessageSent(
        bytes32 indexed outboxId,
        string indexed destinationChain,
        string receiver,
        bytes payload,
        string[] attributes
    );

    function sendMessage(
        string calldata destinationChain,
        string calldata receiver,
        bytes calldata payload,
        string[] calldata attributes
    ) external payable returns (bytes32 outboxId);
}
