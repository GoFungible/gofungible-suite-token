// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

interface IExtTransferINBlockX {

    /**
     * @dev Hook that is called before any token transfer
     * @param toChain Address receiving tokens (address(0) for burns)
     * @param toAddress Address sending tokens (address(0) for mints)
     * @param amount Amount of tokens being transferred (ERC20)
     */
    function _beforeTokenTransferBlock(uint256 toChain, address toAddress, uint256 amount) external returns (bool);
		
}