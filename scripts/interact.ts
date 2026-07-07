// scripts/interact.ts
import { ethers } from "hardhat";
import { NodeToken, BridgeRouter, ValidatorNode } from "../typechain-types";

async function main() {
  console.log("🎮 Starting network interaction...\n");

  // Get signers
  const [deployer, user1, user2, validator1, validator2, validator3] = await ethers.getSigners();
  
  // Replace these with actual deployed addresses from your deployment
  const nodeTokenAddresses = {
    1: "0xYourEthereumNodeAddress",
    137: "0xYourPolygonNodeAddress",
    56: "0xYourBSCNodeAddress",
    42161: "0xYourArbitrumNodeAddress",
    10: "0xYourOptimismNodeAddress"
  };
  
  const bridgeRouterAddress = "0xYourBridgeRouterAddress";
  const validatorAddresses = [
    "0xYourValidator1Address",
    "0xYourValidator2Address",
    "0xYourValidator3Address"
  ];

  // Connect to contracts
  const bridgeRouter = await ethers.getContractAt("BridgeRouter", bridgeRouterAddress) as BridgeRouter;
  
  const ethNode = await ethers.getContractAt("NodeToken", nodeTokenAddresses[1]) as NodeToken;
  const polygonNode = await ethers.getContractAt("NodeToken", nodeTokenAddresses[137]) as NodeToken;

  // 1. Check initial balances
  console.log("💰 Initial Balances:");
  console.log(`  Deployer ETH balance: ${ethers.formatEther(await ethNode.balanceOf(deployer.address))} NODE1`);
  console.log(`  User1 ETH balance: ${ethers.formatEther(await ethNode.balanceOf(user1.address))} NODE1`);

  // 2. Transfer some tokens to users
  console.log("\n💸 Transferring tokens to users...");
  
  const transferAmount = ethers.parseEther("1000");
  await ethNode.connect(deployer).transfer(await user1.getAddress(), transferAmount);
  await ethNode.connect(deployer).transfer(await user2.getAddress(), transferAmount);
  
  console.log(`  Transferred ${ethers.formatEther(transferAmount)} NODE1 to User1`);
  console.log(`  Transferred ${ethers.formatEther(transferAmount)} NODE1 to User2`);

  // 3. Create transactions on Ethereum chain
  console.log("\n📝 Creating transactions on Ethereum chain...");
  
  const tx1 = await ethNode.connect(user1).createTransaction(
    await user2.getAddress(), 
    ethers.parseEther("500")
  );
  const receipt1 = await tx1.wait();
  console.log(`  Transaction 1 created: ${receipt1?.hash}`);

  const tx2 = await ethNode.connect(user2).createTransaction(
    await user1.getAddress(), 
    ethers.parseEther("250")
  );
  const receipt2 = await tx2.wait();
  console.log(`  Transaction 2 created: ${receipt2?.hash}`);

  // 4. Check pending transactions
  console.log("\n⏳ Pending transactions on Ethereum:");
  const pendingTxs = await ethNode.getPendingTransactions();
  console.log(`  ${pendingTxs.length} transactions pending`);

  // 5. Validator submits a block
  console.log("\n📦 Validator submitting block...");
  
  const blockData = ethers.toUtf8Bytes(`Block at ${Date.now()}`);
  const submitTx = await ethNode.connect(validator1).submitBlock(blockData, pendingTxs);
  await submitTx.wait();
  
  const currentBlock = await ethNode.currentBlockNumber();
  console.log(`  Block submitted. Current block number: ${currentBlock}`);

  // 6. Get block details
  console.log("\n🔍 Block details:");
  const block = await ethNode.getBlock(currentBlock);
  console.log({
    blockNumber: block[1].toString(),
    blockHash: block[0],
    previousHash: block[2],
    timestamp: new Date(Number(block[3]) * 1000).toLocaleString(),
    validator: block[5],
    transactionCount: block[7].length
  });

  // 7. Verify block integrity
  console.log("\n🔐 Verifying block integrity:");
  const isValid = await ethNode.verifyBlock(currentBlock);
  console.log(`  Block #${currentBlock} is ${isValid ? 'valid ✓' : 'invalid ✗'}`);

  console.log("\n🎉 Interaction complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });