// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../erc-7786/IERC7786GatewaySource.sol";
import "../erc-7786/IERC7786Recipient.sol";

contract MaliciusERC7786Gateway is IERC7786GatewaySource {

    function sendMessage(
        string calldata destinationChain,
        string calldata receiver,
        bytes calldata payload,
        string[] calldata attributes
    ) external payable returns (bytes32 outboxId) {
			
		}

}