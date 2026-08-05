// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "./IFungible.sol";

contract Extension {
	// Unique deterministic hashes representing rule options
	bytes32 constant MAX_TX_KEY = keccak256("rules.v1.maxTxAmount");
	bytes32 constant ENABLED_KEY = keccak256("rules.v1.tradingEnabled");

	// This exact structure layout must map to how the Caller assigns its mapping pointer.
	// In Solidity, mapping slots are calculated via keccak256(key, mapping_slot_position)
	// To make this robustly simple without calculating mapping slots in assembly, 
	// we mirror the internal mapping structure or write directly via raw SSTORE to a namespace.
	
	function setupRulesInline(uint256 _maxTx, bool _enabled) external {
		// Because this runs via DELEGATECALL, we write straight to the Caller's storage.
		// To safely find the unstructured slots used by our keys, we can use direct SSTOREs.
		bytes32 maxTxBytes = bytes32(_maxTx);
		bytes32 enabledBytes = _enabled ? bytes32(uint256(1)) : bytes32(uint256(0));

		bytes32 maxTxSlot = MAX_TX_KEY;
		bytes32 enabledSlot = ENABLED_KEY;

		assembly {
			sstore(maxTxSlot, maxTxBytes)
			sstore(enabledSlot, enabledBytes)
		}
	}

	// Read-only validation executing during standard token transfers (via STATICCALL)
	function validateTransfer(address token, address from, address to, uint256 amount) external view {
		// Reads from the token's public readConfig wrapper
		uint256 maxTransferAmount = uint256(IFungible(token).readConfig(MAX_TX_KEY));
		bool tradingEnabled = IFungible(token).readConfig(ENABLED_KEY) != bytes32(0);

		require(tradingEnabled, "Trading currently paused");
		require(amount <= maxTransferAmount, "Exceeds max allowed transfer amount");
	}
}
