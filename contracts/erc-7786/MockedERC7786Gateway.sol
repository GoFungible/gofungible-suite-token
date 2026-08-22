// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./IERC7786GatewaySource.sol";
import "./IERC7786Recipient.sol";
import "./IGatewayReceiver.sol";
import {LibERC7786ToEthAdapter} from "./LibERC7786ToEthAdapter.sol";

import "hardhat/console.sol";

// Look at how ERC-7985 handles EVM gas limits and execution timeouts within the gateway. 
contract MockedERC7786Gateway is IERC7786GatewaySource, IGatewayReceiver {

	constructor() {
		console.log("deployed gateway on ", block.chainid);
		console.log("deployed gateway at ", address(this));
	}

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
	function sendMessage(bytes calldata recipientBOA, bytes calldata payload, bytes[] calldata attributes) external payable override /*nonReentrant*/ returns (bytes32 outboxId) {
		//require(recipient.length == 20, "MockERC7786: Invalid recipient address length");
		console.log("sending Message 1");

		// State & Identifier updates
		_nonce++;
		outboxId = keccak256(abi.encodePacked(block.timestamp, msg.sender, _nonce));

		// TODO: HERE IS A CAIP-350.
		(uint256 receiverChainId, address receiverAddress) = LibERC7786ToEthAdapter.parseERC7930Record(recipientBOA);
		console.log("sending Message 2 chainId", receiverChainId);
		console.log("sending Message 2 receiverAddress", receiverAddress);
		
		// create Binary Interoperable Address for sender
		bytes memory senderBOA = LibERC7786ToEthAdapter.generateERC7930Record(block.chainid, msg.sender);

		// sending to the same chainId()
		if (receiverChainId == block.chainid) {

			bytes4 response = IERC7786Recipient(receiverAddress).receiveMessage(outboxId, senderBOA, payload);
			console.log("Message delivered within the chain", block.chainid);

			// Verification
			require(response == IERC7786Recipient.receiveMessage.selector, "ERC7786: invalid receiver response");
		} 
		
		// sending to other chainId()
		else {

			// Emitting log safely at the end of the call execution sequence
			console.log("sending Message 4 to", receiverChainId);
			console.log("sending Message 4 to", receiverAddress);
			emit MessageSent(outboxId, senderBOA, recipientBOA, payload, msg.value, attributes);
			console.log("MessageSent fired!!!");
		}

		return outboxId;
	}

	/**
	 * @notice Entrypoint invoked by your off-chain Ethers.js relayer script.
	 */
	function executeRelayedMessage(bytes32 sendId, bytes memory senderBOA, bytes memory recipientBOA, bytes memory payload, uint256 value, bytes[] memory attributes) external returns (bytes4)  {

		// Execute push delivery to the recipient target contract
		// bytes4 selector = Fungible(targetContract).receiveMessage(sourceChainId, sender, messagePayload);
		console.log("gateway receive Message 1");

		// TODO: HERE IS A CAIP-350.
		(uint256 receiverChainId, address receiverAddress) = LibERC7786ToEthAdapter.parseERC7930Record(recipientBOA);
		console.log("executeRelayedMessage chainId", receiverChainId);
		console.log("executeRelayedMessage receiverAddress", receiverAddress);

		return IERC7786Recipient(receiverAddress).receiveMessage(sendId, senderBOA, payload);
	}

	function supportsAttribute(bytes4 /* selector */) external pure override returns (bool) {
		return false;
	}

}
