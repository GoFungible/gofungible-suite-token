// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Hardhat only compiles contracts in /contracts folder
// In order to use the Mocked classes we need to import them in /contracts so their types get created
// The rest of options to overcome this are worse.
import "gofungible-erc-20-multichain-relayer-extension/contracts/mock/MockedSupplyRelayer.t.sol";
