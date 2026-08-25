// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./IERC7786GatewaySource.sol";
import "./IERC7786Recipient.sol";
import "./IGatewayReceiver.sol";
import "../IFungible.sol";
import {LibERC7786ToEthAdapter} from "./LibERC7786ToEthAdapter.sol";

import "hardhat/console.sol";

// Look at how ERC-7985 handles EVM gas limits and execution timeouts within the gateway. 
contract MockedERC7786Gateway is IERC7786GatewaySource, IGatewayReceiver {

	constructor() {
		console.log("deployed gateway on ", block.chainid);
		console.log("deployed gateway at ", address(this));
	}

  function chainId() view external returns(uint256) {
		return block.chainid;
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

	function supportsAttribute(bytes4 /* selector */) external pure override returns (bool) {
		return false;
	}

	uint256 private _nonce;

	// ************************************************************************************************
	// *********************** Request: Token1 -> (ERC-7786) Gateway -> Relayer) **********************
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
		print(0, "sending Message 2 to", receiverChainId, receiverAddress);

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
			print(0, "sending Message 4 to", receiverChainId, receiverAddress);
			emit MessageSent(outboxId, senderBOA, recipientBOA, payload, msg.value, attributes);
			console.log("MessageSent fired!!!");
		}

		return outboxId;
	}

	// ************************************************************************************************
	// ***************************** Request: Relayer -> Gateway -> Token2 ****************************
	// ************************************************************************************************
	/**
	 * @notice Entrypoint invoked by your off-chain Ethers.js relayer script.
	 */
	function sendRelayerMessageToToken(bytes32 id, bytes memory senderBOA, bytes memory recipientBOA, bytes memory payload, uint256 value, bytes[] memory attributes) external returns (bytes4)  {

		// Execute push delivery to the recipient target contract
		// bytes4 selector = Fungible(targetContract).receiveMessage(sourceChainId, sender, messagePayload);
		console.log(string(abi.encodePacked(id, " | ", " gateway receive Message 1")));

		// TODO: HERE IS A CAIP-350.
		(uint256 receiverChainId, address receiverAddress) = LibERC7786ToEthAdapter.parseERC7930Record(recipientBOA);
		print(id, "executeRelayedMessage chainId", receiverChainId, receiverAddress);

		return IERC7786Recipient(receiverAddress).receiveMessage(id, senderBOA, payload);
	}

	// ************************************************************************************************
	// ************************ Response: Relayer -> Gateway -> Token1 (ERC-7786) *********************
	// ************************************************************************************************

	// invoked by relayer to notify SUCESS or FAILURE
	// calls token _onCrosschainMessageCallback
	function onRelayerCallback(bytes32 id, bytes memory senderBOA, bytes4 selectorIfError) external returns (bytes4)  {
		print(id, "Message response received by gateway Result");
		console.logBytes4(selectorIfError);

		// notifies token _onCrosschainMessageCallback
		(uint256 senderChainId, address senderAddress) = LibERC7786ToEthAdapter.parseERC7930Record(senderBOA);
		IFungible(senderAddress)._onCrosschainMessageCallback(id, "", selectorIfError);
		print(id, "Fungible notified about the message resultkkk");

	}

	function print(bytes32 id, string memory message) public {
			console.log(string(abi.encodePacked("<< ", _toHexString(id), " >>: ", message)));
	}
	function print(bytes32 id, string memory message, uint256 data) public {
			console.log(string(abi.encodePacked("<< ", _toHexString(id), " >>: ", message, data)));
	}
	function print(bytes32 id, string memory message, address _address) public {
			console.log(string(abi.encodePacked("<< ", _toHexString(id), " >>: ", message, string(abi.encodePacked(_address)))));
	}
	function print(bytes32 id, string memory message, uint256 data, address _address) public {
			console.log(string(abi.encodePacked("<< ", _toHexString(id), " >>: ", message, data, string(abi.encodePacked(_address)))));
	}
	function _toHexString(bytes32 data) internal pure returns (string memory) {
			bytes memory alphabet = "0123456789abcdef";
			bytes memory str = new bytes(64);
			for (uint256 i = 0; i < 32; i++) {
					str[i*2] = alphabet[uint8(data[i] >> 4)];
					str[i*2 + 1] = alphabet[uint8(data[i] & 0x0f)];
			}
			return string(str);
	}


}
