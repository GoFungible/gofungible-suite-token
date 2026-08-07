// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

abstract contract IFungible {

	// ************************************************************************************************
	// ********************************************* Defaut *******************************************
	// ************************************************************************************************
	// NO receive() function is declared here.
	/*receive() external payable {
	}*/
	// Fallback handles missing function calls but rejects Ether
	fallback() external {
		// Any transaction trying to send Ether here will fail automatically.
		// If you want a custom error message, you can uncomment the line below:
		// require(msg.value == 0, "No Ether allowed");
	}

	// Gas-efficient status flags (avoiding zero values saves gas)
	uint256 private constant _NOT_ENTERED = 1;
	uint256 private constant _ENTERED = 2;
		uint256 private _status;

	// Custom reentrancy guard modifier
	modifier nonReentrant() {
		// On the second call (reentrancy), this check will fail
		require(_status != _ENTERED, "REENTRANCY_REJECTED");

		// Lock the contract
		_status = _ENTERED;

		// Execute the function code
		_;

		// Unlock the contract after execution finishes
		_status = _NOT_ENTERED;
	}

	// ************************************************************************************************
	// ********************************************* Defaut *******************************************
	// ************************************************************************************************
	// Magic protocol version indicator for Interoperable Addresses
	bytes2 private constant V1_PREFIX = 0x23CE; 
	// CAIP-350 Namespace Identifier for standard EVM chains
	bytes1 private constant CHAIN_TYPE_EVM = 0x01; 

	/**
	 * @notice Encodes a standard EVM address and chainId into an ERC-7930 Interoperable Address payload.
	 * @param chainId The EIP-155 target chain ID (e.g., 1 for Ethereum, 8453 for Base).
	 * @param targetAccount The 20-byte native target address.
	 * @return The fully compliant ERC-7930 binary record.
	 */
	function generateERC7930Record(uint256 chainId, address targetAccount) external pure returns (bytes memory) {
		// Step 1: Compress the chain ID down into minimal packed bytes
		bytes memory chainRef = _encodeMinLengthUint(chainId);
		bytes1 chainRefLength = bytes1(uint8(chainRef.length));

		// Step 2: Pack everything tightly together without standard ABI padding
		return abi.encodePacked(
			V1_PREFIX,
			CHAIN_TYPE_EVM,
			chainRefLength,
			chainRef,
			targetAccount
		);
	}

	/**
	 * @dev Helper to drop high-order zero bytes from an integer for tight binary envelopes.
	 */
	function _encodeMinLengthUint(uint256 value) internal pure returns (bytes memory) {
		if (value == 0) {
			return abi.encodePacked(bytes1(0x00));
		}
		
		// Calculate dynamic byte-length footprint
		uint256 temp = value;
		uint256 length = 0;
		while (temp > 0) {
			length++;
			temp >>= 8;
		}

		bytes memory result = new bytes(length);
		for (uint256 i = 0; i < length; i++) {
			result[length - 1 - i] = bytes1(uint8(value >> (i * 8)));
		}
		return result;
	}

	error InvalidPrefix();
	error UnsupportedChainType();
	error InvalidAddressLength();
	error ChainIdOverflow();

	/**
	 * @notice Parses an ERC-7930 byte payload to extract the destination chainId and EVM address.
	 * @param record The raw ERC-7930 interoperable binary payload.
	 * @return chainId The target network EIP-155 identifier (uint256 to support EVM standards).
	 * @return targetAddress The decoded 20-byte native EVM wallet or contract address.
	 */
	function parseERC7930Record(bytes calldata record) external pure returns (uint256 chainId, address targetAddress) {
		// Enforce basic structural length checks (Prefix 2B + Type 1B + RefLen 1B + AddrLen 1B + Addr 20B = 25B minimum)
		if (record.length < 25) revert InvalidPrefix();

		// 1. Validate the Magic Prefix (Bytes 0-1)
		bytes2 prefix = bytes2(record[0:2]);
		if (prefix != V1_PREFIX) revert InvalidPrefix();

		// 2. Validate the Namespace Architecture (Byte 2)
		bytes1 chainType = record[2];
		if (chainType != CHAIN_TYPE_EVM) revert UnsupportedChainType();

		// 3. Extract Chain Reference Length (Byte 3)
		uint8 chainRefLength = uint8(record[3]);
		if (chainRefLength > 32) revert ChainIdOverflow(); // Cannot exceed 32 bytes for a uint256
		
		// 4. Decode the variable-length ChainReference into a uint256
		uint256 cursor = 4;
		for (uint256 i = 0; i < chainRefLength; i++) {
			chainId = (chainId << 8) | uint8(record[cursor]);
			cursor++;
		}

		// 5. Extract Address Length and validate it matches EVM constraints (20 bytes)
		uint8 addrLength = uint8(record[cursor]);
		if (addrLength != 20) revert InvalidAddressLength();
		cursor++;

		// 6. Slice out the native address payload using assembly pointer arithmetic
		assembly {
			// Calldata array storage layout offsets the underlying payload by 34 bytes 
			// (32 bytes length slot + offset start pointer location)
			targetAddress := shr(96, calldataload(add(record.offset, cursor)))
		}
	}

	// (uint256 chainId, address targetAddress) = parseERC7930Record(record);

	// ************************************************************************************************
	// ******************************************* Extensions *****************************************
	// ************************************************************************************************  
	function writeConfig(bytes32 key, bytes32 value) external virtual;

  function readConfig(bytes32 key) external view virtual returns (bytes32);

	// ************************************************************************************************
	// ************************************** Good Practices Applied **********************************
	// ************************************************************************************************
	// * CEI Pattern (Checks-Effects-Interactions)
	// * nonReentrant
	// * Cross-Contract Reentrancy
	// * Use non-zero values (like 1 and 2) as changing a storage slot from 0 to 1 costs more gas than changing it from 1 to 2.
	// * Place interactions at the very end to minimize reentrancy risks.



}