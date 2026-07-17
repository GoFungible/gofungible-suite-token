// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IExtRelayerSwap {

    /**
     * @dev Hook that is called before any token transfer
     * @param toChain Chain swapping to
     * @param toAddress Address receiving tokens (address(0) for burns)
     * @param amount Amount of tokens being transferred (ERC20)
     */
    function _afterSwapReceived(uint256 toChain, address toAddress, uint256 amount) external returns (bool);
		
}