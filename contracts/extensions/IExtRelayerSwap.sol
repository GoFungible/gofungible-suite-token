// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IExtRelayerSwap {

    /**
     * @dev Hook that is called before any token transfer
     * @param from Address sending tokens (address(0) for mints)
     * @param to Address receiving tokens (address(0) for burns)
     * @param amount Amount of tokens being transferred (ERC20)
     */
    function _afterSwapReceived(address from, address to, uint256 amount) external returns (bool);
		
}