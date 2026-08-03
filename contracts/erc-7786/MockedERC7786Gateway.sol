// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "../erc-7786/IERC7786GatewaySource.sol";
import "../erc-7786/IERC7786Recipient.sol";

contract MockedERC7786Gateway is IERC7786GatewaySource {
    
    // An arbitrary identifier for this mock network's chain name (CAIP-10 compatible string)
    string public constant MOCK_SOURCE_CHAIN = "eip155:1"; 
    
    // A simple counter to generate unique outbox IDs
    uint256 private _nonce;

    /**
     * @notice Sends a cross-chain message. In this mock, it forwards it synchronously.
     * @param destinationChain The target network identity.
     * @param receiver The address string of the target contract.
     * @param payload The data being passed to the receiver.
     * @param attributes Optional execution parameters (e.g., gas limits).
     */
    function sendMessage(string calldata destinationChain, string calldata receiver, bytes calldata payload, string[] calldata attributes) external payable override returns (bytes32 outboxId) {
        // 1. Generate a mock outbox ID
        _nonce++;
        outboxId = keccak256(abi.encodePacked(block.timestamp, msg.sender, _nonce));

        // 2. Emit the required standard event
        emit MessageSent(outboxId, destinationChain, receiver, payload, attributes);

        // 3. Convert the string receiver back into a usable address
        address receiverAddress = _parseAddress(receiver);

        // 4. Format the caller address into a CAIP-10 compliant string representation
        string memory senderString = _toString(msg.sender);

        // 5. Synchronously mock delivery by directly calling the receiver contract
        // ERC-7786 expects the receiving function to return a specific 4-byte success selector.
        bytes4 magicValue = IERC7786Recipient(receiverAddress).receiveMessage(
					outboxId,
					MOCK_SOURCE_CHAIN,
					senderString,
					payload
        );

        // ERC-7786 requirement: Validate the receiver recognized the protocol hand-off
        require(magicValue == IERC7786Recipient.receiveMessage.selector, "ERC7786: invalid receiver response");
    }

    /**
     * @dev Helper to convert an execution string ("0x...") back into an address type.
     */
    function _parseAddress(string calldata accountStr) internal pure returns (address) {
        bytes calldata accountBytes = bytes(accountStr);
        require(accountBytes.length == 42, "MockERC7786: Invalid address string length");
        
        uint160 addressValue = 0;
        for (uint256 i = 2; i < 42; i++) {
					uint160 digit = uint160(uint8(accountBytes[i]));
					if (digit >= 48 && digit <= 57) {
						digit -= 48;
					} else if (digit >= 65 && digit <= 70) {
						digit -= 55;
					} else if (digit >= 97 && digit <= 102) {
						digit -= 87;
					} else {
						revert("MockERC7786: Invalid character in hex string");
					}
					addressValue = (addressValue << 4) + digit;
        }
        return address(addressValue);
    }

    /**
     * @dev Helper to convert address types into a string format for CAIP-10 payload framing.
     */
    function _toString(address account) internal pure returns (string memory) {
			bytes memory alphabet = "0123456789abcdef";
			bytes memory str = new bytes(42);
			
			// Correct index positioning for "0x"
			str[0] = "0";
			str[1] = "x";
			
			// Correct loop assignments and bit shift operations
			for (uint256 i = 0; i < 20; i++) {
				str[2 * i + 2] = alphabet[uint8(uint160(account) >> (8 * (19 - i) + 4)) & 0xf];
				str[2 * i + 3] = alphabet[uint8(uint160(account) >> (8 * (19 - i))) & 0xf];
			}
			return string(str);
    }
}
