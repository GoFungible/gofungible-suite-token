// scripts/deploy.ts
import { ethers } from "hardhat"; // This is the correct import for hardhat
import { NodeToken, BridgeRouter, ValidatorNode } from "../typechain-types";

async function main() {
  console.log("🚀 Starting deployment of blockchain network...\n");

  const [deployer, validator1, validator2, validator3, validator4, validator5] = await ethers.getSigners();
  
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Validator addresses: ${validator1.address}, ${validator2.address}, ${validator3.address}\n`);

  // Define chains to deploy
  const chains = [
    { name: "Ethereum", chainId: 1, initialSupply: ethers.parseEther("1000000") },
    { name: "Polygon", chainId: 137, initialSupply: ethers.parseEther("1000000") },
    { name: "BSC", chainId: 56, initialSupply: ethers.parseEther("1000000") },
    { name: "Arbitrum", chainId: 42161, initialSupply: ethers.parseEther("1000000") },
    { name: "Optimism", chainId: 10, initialSupply: ethers.parseEther("1000000") }
  ];

  // Deploy NodeTokens for each chain
  console.log("📦 Deploying NodeToken contracts...");
  
  const nodeTokens: { [key: number]: NodeToken } = {};
  
  for (const chain of chains) {
    console.log(`  Deploying NodeToken for ${chain.name} (Chain ID: ${chain.chainId})...`);
    
    const NodeTokenFactory = await ethers.getContractFactory("NodeToken");
    const nodeToken = await NodeTokenFactory.deploy(
      `Node Token ${chain.name}`,
      `NODE${chain.chainId}`,
      chain.chainId,
      deployer.address
    ) as NodeToken;
    
    await nodeToken.waitForDeployment();
    const address = await nodeToken.getAddress();
    
    nodeTokens[chain.chainId] = nodeToken;
    
    console.log(`    ✅ Deployed to: ${address}`);
  }

  // Deploy BridgeRouter
  console.log("\n🌉 Deploying BridgeRouter...");
  
  const BridgeRouterFactory = await ethers.getContractFactory("BridgeRouter");
  const bridgeRouter = await BridgeRouterFactory.deploy() as BridgeRouter;
  await bridgeRouter.waitForDeployment();
  const bridgeAddress = await bridgeRouter.getAddress();
  
  console.log(`  ✅ BridgeRouter deployed to: ${bridgeAddress}`);

  // Register chains with BridgeRouter
  console.log("\n📝 Registering chains with BridgeRouter...");
  
  for (const chain of chains) {
    const nodeToken = nodeTokens[chain.chainId];
    const nodeAddress = await nodeToken.getAddress();
    
    await bridgeRouter.registerChain(
      chain.chainId,
      nodeAddress,
      chain.name,
      3 // required validators
    );
    
    console.log(`  ✅ Registered ${chain.name} (Chain ID: ${chain.chainId})`);
  }

  // Deploy ValidatorNodes
  console.log("\n👤 Deploying ValidatorNodes...");
  
  const validators: ValidatorNode[] = [];
  const validatorAddresses = [validator1, validator2, validator3, validator4, validator5];
  
  for (let i = 0; i < validatorAddresses.length; i++) {
    const ValidatorNodeFactory = await ethers.getContractFactory("ValidatorNode");
    const validator = await ValidatorNodeFactory.deploy() as ValidatorNode;
    await validator.waitForDeployment();
    
    validators.push(validator);
    const validatorAddr = await validator.getAddress();
    
    console.log(`  ✅ ValidatorNode ${i + 1} deployed to: ${validatorAddr}`);
    
    // Add supported chains to validator
    const supportedChains = [1, 137, 56, 42161, 10]; // All chains
    for (const chainId of supportedChains) {
      await validator.addSupportedChain(chainId);
    }
    
    // Deposit stake
    await validator.connect(validatorAddresses[i]).depositStake({ value: ethers.parseEther("10") });
    
    // Add validator to each NodeToken
    for (const chain of chains) {
      const nodeToken = nodeTokens[chain.chainId];
      await nodeToken.addValidator(validatorAddr, ethers.parseEther("10"));
    }
    
    console.log(`    ✅ Validator ${i + 1} configured with stake and supported chains`);
  }

  // Add cross-chain validators
  console.log("\n🔄 Configuring cross-chain validators...");
  
  for (const chain of chains) {
    const nodeToken = nodeTokens[chain.chainId];
    
    for (let i = 0; i < validators.length; i++) {
      const validator = validators[i];
      const validatorAddr = await validator.getAddress();
      
      // Add as cross-chain validator to other chains
      for (const otherChain of chains) {
        if (otherChain.chainId !== chain.chainId) {
          const otherNode = nodeTokens[otherChain.chainId];
          await otherNode.addCrossChainValidator(chain.chainId, validatorAddr);
        }
      }
    }
  }
  
  console.log("  ✅ Cross-chain validators configured");

  // Save deployment info
  const deploymentInfo = {
    chains: await Promise.all(chains.map(async chain => ({
      name: chain.name,
      chainId: chain.chainId,
      nodeToken: await nodeTokens[chain.chainId].getAddress()
    }))),
    bridgeRouter: bridgeAddress,
    validators: await Promise.all(validators.map(async v => ({
      address: await v.getAddress(),
      supportedChains: [1, 137, 56, 42161, 10]
    })))
  };

  console.log("\n📊 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n✅ Deployment complete!");
  
  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });