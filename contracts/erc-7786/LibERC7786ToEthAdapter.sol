// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "hardhat/console.sol";

library LibERC7786ToEthAdapter {

	// Unique standard Type/Namespace for EVM/EIP-155 chains (equivalent to 0x0001)
	bytes2 private constant EVM_NAMESPACE = 0x0001;

	/**
	 * @notice Encodes a standard EVM address and chainId into an ERC-7930 Interoperable Address payload.
	 * @param chainId The EIP-155 target chain ID (e.g., 1 for Ethereum, 8453 for Base).
	 * @param targetAccount The 20-byte native target address.
	 * @return The fully compliant ERC-7930 binary record.
	 */
	function generateERC7930Record(uint256 chainId, address targetAccount) internal pure returns (bytes memory) {
		// ABI encode the numeric chainId and account address into explicit sub-buffers
		bytes memory chainReference = abi.encode(chainId);
		bytes memory addr = abi.encode(targetAccount);

		// Pack the profile fields together linearly using standard ABI sequence serialization
		return abi.encode(EVM_NAMESPACE, chainReference, addr);
	}

	/**
	 * @notice Parses an ERC-7930 byte payload to extract the destination chainId and EVM address.
	 * @param interoperableRecord The raw ERC-7930 interoperable binary payload.
	 * @return chainId The target network EIP-155 identifier (uint256 to support EVM standards).
	 * @return targetAccount The decoded 20-byte native EVM wallet or contract address.
	 */
	// Parse ERC7930 record
	function parseERC7930Record(bytes memory interoperableRecord) internal pure returns (uint256 chainId, address targetAccount) {
		// Enforce that the data array contains at least enough bytes for basic structural layout
		require(interoperableRecord.length >= 68, "Malformed record layout");

		// Decode the structure back into its base components
		(bytes2 chainType, bytes memory chainReference, bytes memory addr) = abi.decode(interoperableRecord, (bytes2, bytes, bytes));

		// Enforce type validation to ensure it matches the standard EVM namespace type
		require(chainType == EVM_NAMESPACE, "Unsupported chain namespace");

		// Convert the dynamic inner data blocks back to native Solidity variable definitions
		chainId = abi.decode(chainReference, (uint256));
		targetAccount = abi.decode(addr, (address));

    console.log("chainId OUT", chainId);
    console.log("targetAccount OUT", targetAccount);

    return (chainId, targetAccount);
	}
}
