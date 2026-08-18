// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./IERC7786GatewaySource.sol";
import "./IERC7786Recipient.sol";
import {LibERC7786ToEthAdapter} from "./LibERC7786ToEthAdapter.sol";

import "hardhat/console.sol";

// Look at how ERC-7985 handles EVM gas limits and execution timeouts within the gateway. 
contract MockedERC7786Gateway is IERC7786GatewaySource {

	// ************************************************************************************************
	// *************************************** Reentrancy Guard ***************************************
	// ************************************************************************************************  
	// Custom reentrancy guard states (using efficient uint256 markers)
	uint256 private constant _NOT_ENTERED = 1;
	uint256 private constant _ENTERED = 2;
	uint256 private _status = 1; // 1 = _NOT_ENTERED, 2 = _ENTERED

	// Custom error for reentrancy violations
	error ReentrancyGuardReentrantCall();

	/**
	 * @dev Custom reentrancy guard modifier built directly into the contract.
	 */
	modifier nonReentrant() {
		if (_status == _ENTERED) revert ReentrancyGuardReentrantCall();
		_status = _ENTERED;
		_;
		_status = _NOT_ENTERED;
	}

	uint256 private _nonce;

  function chainId() view external returns(uint256) {
		return block.chainid;
	}

	// ************************************************************************************************
	// ******************************************* ERC-7786 *******************************************
	// ************************************************************************************************  
	/**
	 * @notice Synchronously forwards messages protected by the custom nonReentrant modifier.
	 */
	function sendMessage(bytes calldata recipient, bytes calldata payload, bytes[] calldata attributes) external payable override nonReentrant returns (bytes32 outboxId) {
		//require(recipient.length == 20, "MockERC7786: Invalid recipient address length");
		console.log("sending Message 1");

		// State & Identifier updates
		_nonce++;
		outboxId = keccak256(abi.encodePacked(block.timestamp, msg.sender, _nonce));

		// TODO: HERE IS A CAIP-350.
		(uint256 _chainId, address receiverAddress) = LibERC7786ToEthAdapter.parseERC7930Record(recipient);
		console.log("sending Message 2 chainId", _chainId);
		console.log("sending Message 2 receiverAddress", receiverAddress);
		
		bytes memory senderBytes = abi.encodePacked(msg.sender);

		// Execution hand-off interaction (External Call)
		bytes4 magicValue = IERC7786Recipient(receiverAddress).receiveMessage(outboxId, senderBytes, payload);

		console.log("sending Message 3");

		// Verification
		require(magicValue == IERC7786Recipient.receiveMessage.selector, "ERC7786: invalid receiver response");

		console.log("sending Message 4");

		// Emitting log safely at the end of the call execution sequence
		emit MessageSent(outboxId, senderBytes, recipient, payload, msg.value, attributes);

		console.log("sending Message 5");

	}

	function supportsAttribute(bytes4 /* selector */) external pure override returns (bool) {
		return false;
	}

}
