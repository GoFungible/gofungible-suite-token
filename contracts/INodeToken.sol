
// SPDX-License-Identifier: MIT
pragma solidity >=0.8.30;

interface INodeToken {
    /*function verifyBlock(uint256 blockNumber) external view returns (bool);
    function getBlock(uint256 blockNumber) external view returns (
        bytes32 blockHash,
        uint256 _blockNumber,
        bytes32 previousHash,
        uint256 timestamp,
        bytes memory data,
        address validator,
        uint256 _chainId,
        bytes32[] memory transactionHashes
    );*/
		function receiveSyncNodesTransaction(uint256 sourceChain, uint256 destChain, uint256 amount) external;
}