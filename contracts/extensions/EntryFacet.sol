// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;


import "./IExtension.sol";

/**
 * @title EntryFacet
 * @dev Example ERC20 token demonstrating _beforeTokenTransfer and _afterTokenTransfer hooks
 */
contract EntryFacet is IEntryFacet {
    

    /**
     * @dev Hook that is called before any transfer of tokens.
     * This includes minting and burning.
     */
    function _beforeTokenTransferBlock(
        address from,
        address to,
        uint256 amount
    ) external virtual override returns (bool){

    }

    /**
     * @dev Hook that is called before any transfer of tokens.
     * This includes minting and burning.
     */
    function _beforeTokenTransferLog(
        address from,
        address to,
        uint256 amount
    ) external virtual override {

    }

    /**
     * @dev Hook that is called before any transfer of tokens.
     * This includes minting and burning.
     */
    function _beforeTokenTransferUpdate(
        address from,
        address to,
        uint256 amount
    ) external virtual override returns (uint256) {

    }
    
    /**
     * @dev Hook that is called after any transfer of tokens.
     * This includes minting and burning.
     */
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) external virtual override {

    }
    
}