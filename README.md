# gofungible-suite-core

Code for GoFungible Suite

// https://eips.ethereum.org/EIPS/eip-7425

ERC-7425: ERC-YYYY CrossChain Blockchain

Title: ERC-YYYY CrossChain Blockchain

Short Description: n extension to guarantee supply integraity across networks

Authors	Jimmy Debe (@jimstir)

Created	2023-06-30

Discussion Link	https://ethereum-magicians.org/t/eip-7425-tokenized-reserve/15297

Requires	EIP-XXXX

Table of Contents

Abstract

Motivation

Use a bridge to transfer liquidity

* Misuse by issuer

* Misuse by third party

Specification

* There is a immutable part and a proxy

* The immutable part:

	* The nodes of the immutable part form a blockchain that stores n states.
	
	* contains:
	
		* totalSupply, globalSupply, supplyPerChain as part of the upper blockchain state
	
		* balances, out of the upper blockchain state

	* Is fine liquidity fragmentation for a user, transfer can split in chainTransfer and crosschainTransfer

	* State storage allows reverting in case of hack

* The proxy part 

	* contains allowances and whatever diamond facets

	* The proxy part cannot emit events (cannot do cross chain transfers)

	* The proxy is extensable on the ERC-20 hooks


Definitions:


Constructor:


Interface


Rationale

Adding a fallback() the delegatedcall runs in the same execution context that the proxy and blocks the event

contract ImmutableProxy {
    // Immutable - set once at construction, can't be changed even with upgrade
    EventRouter public immutable eventRouter;
    
    // Implementation address (can be upgraded)
    address private implementation;
    
    // The FALLBACK is part of the proxy's BYTECODE
    // Even if we upgrade the implementation, this fallback remains!
    fallback() external payable {
        // This code is IMMUTABLE - it's in the proxy's bytecode
        
        // 1. First, delegate to implementation
        address impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            
            // 2. Check if implementation tried to emit events
            // If returndata contains logs, we intercept and reroute!
            if gt(returndatasize(), 0) {
                // Parse logs and reroute through eventRouter
                // This is complex but possible
            }
            
            // Return normal data
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
    
    // This function is PART OF THE PROXY - can't be removed by upgrades
    function emitTransfer(address from, address to, uint256 value) external {
        // Even if implementation changes, this stays
        eventRouter.emitTransfer(from, to, value);
    }
}

the fallback() can intercept OPCODES (LOG codes are events) 

https://github.com/jason-victor1/EVM-Bytecode-Opcode-Level-Attacks


Backwards Compatibility



Security Considerations



Copyright



Citation


