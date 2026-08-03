// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../erc-7786/IERC7786GatewaySource.sol";
import "../erc-7786/IERC7786Recipient.sol";

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

	// ************************************************************************************************
	// ******************************************* ERC-7786 *******************************************
	// ************************************************************************************************  
	/**
	 * @notice Synchronously forwards messages protected by the custom nonReentrant modifier.
	 */
	function sendMessage(bytes calldata recipient, bytes calldata payload, bytes[] calldata attributes) external payable override nonReentrant returns (bytes32 outboxId) {
		require(recipient.length == 20, "MockERC7786: Invalid recipient address length");

		// State & Identifier updates
		_nonce++;
		outboxId = keccak256(abi.encodePacked(block.timestamp, msg.sender, _nonce));
		
		bytes memory senderBytes = abi.encodePacked(msg.sender);
		address receiverAddress = address(bytes20(recipient[0:20]));

		// Execution hand-off interaction (External Call)
		bytes4 magicValue = IERC7786Recipient(receiverAddress).receiveMessage(outboxId, senderBytes, payload);

		// Verification
		require(magicValue == IERC7786Recipient.receiveMessage.selector, "ERC7786: invalid receiver response");

		// Emitting log safely at the end of the call execution sequence
		emit MessageSent(outboxId, senderBytes, recipient, payload, msg.value, attributes);

	}

	function supportsAttribute(bytes4 /* selector */) external pure override returns (bool) {
		return false;
	}

}
