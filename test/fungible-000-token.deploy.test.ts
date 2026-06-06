// test/network.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { NodeToken, BridgeRouter, ValidatorNode } from "../typechain-types";
import { Signer } from "ethers";

describe.skip("Blockchain Network", function () {
  let nodeToken: NodeToken;
  let bridgeRouter: BridgeRouter;
  let validatorNode: ValidatorNode;
  let deployer: Signer;
  let user1: Signer;
  let user2: Signer;
  let validator: Signer;

  beforeEach(async function () {
    [deployer, user1, user2, validator] = await ethers.getSigners();

    // Deploy NodeToken
    const NodeTokenFactory = await ethers.getContractFactory("NodeToken");
    nodeToken = await NodeTokenFactory.deploy(
      "Test Token",
      "TEST",
      1,
      await deployer.getAddress()
    );
    await nodeToken.waitForDeployment();

    // Deploy BridgeRouter
    const BridgeRouterFactory = await ethers.getContractFactory("BridgeRouter");
    bridgeRouter = await BridgeRouterFactory.deploy();
    await bridgeRouter.waitForDeployment();

    // Deploy ValidatorNode
    const ValidatorNodeFactory = await ethers.getContractFactory("ValidatorNode");
    validatorNode = await ValidatorNodeFactory.deploy();
    await validatorNode.waitForDeployment();

    // Register chain
    await bridgeRouter.registerChain(
      1,
      await nodeToken.getAddress(),
      "Test Chain",
      3
    );

    // Setup validator
    const validatorAddr = await validator.getAddress();
    await validatorNode.connect(validator).depositStake({ value: ethers.parseEther("10") });
    await nodeToken.addValidator(validatorAddr, ethers.parseEther("10"));
  });

  describe("NodeToken", function () {
    it("Should have correct initial supply", async function () {
      const totalSupply = await nodeToken.totalSupply();
      expect(totalSupply).to.equal(ethers.parseEther("1000000"));
    });

    it("Should transfer tokens", async function () {
      const amount = ethers.parseEther("100");
      const user1Addr = await user1.getAddress();
      
      await nodeToken.connect(deployer).transfer(user1Addr, amount);
      
      const balance = await nodeToken.balanceOf(user1Addr);
      expect(balance).to.equal(amount);
    });

    it("Should create transaction", async function () {
      const amount = ethers.parseEther("50");
      const user1Addr = await user1.getAddress();
      const user2Addr = await user2.getAddress();
      
      // Transfer tokens to user1 first
      await nodeToken.connect(deployer).transfer(user1Addr, amount * 2n);
      
      // Create transaction
      await nodeToken.connect(user1).createTransaction(user2Addr, amount);
      
      const pendingTxs = await nodeToken.getPendingTransactions();
      expect(pendingTxs.length).to.equal(1);
    });

    it("Should submit block", async function () {
      const amount = ethers.parseEther("50");
      const user1Addr = await user1.getAddress();
      const user2Addr = await user2.getAddress();
      
      // Transfer and create transaction
      await nodeToken.connect(deployer).transfer(user1Addr, amount * 2n);
      const tx = await nodeToken.connect(user1).createTransaction(user2Addr, amount);
      const receipt = await tx.wait();
      
      // Get transaction hash from events
      const events = await nodeToken.queryFilter(nodeToken.filters.TransactionCreated());
      const txHash = events[0].args?.txHash;
      
      // Submit block
      const blockData = ethers.toUtf8Bytes("Test Block");
      await nodeToken.connect(validator).submitBlock(blockData, [txHash]);
      
      const currentBlock = await nodeToken.currentBlockNumber();
      expect(currentBlock).to.equal(1);
    });
  });

  describe("BridgeRouter", function () {
    it("Should register chain", async function () {
      const chainInfo = await bridgeRouter.getChainInfo(1);
      expect(chainInfo.name).to.equal("Test Chain");
      expect(chainInfo.isActive).to.be.true;
    });

    it("Should initiate cross-chain transfer", async function () {
      const amount = ethers.parseEther("100");
      const user1Addr = await user1.getAddress();
      const user2Addr = await user2.getAddress();
      
      // Transfer tokens to user1
      await nodeToken.connect(deployer).transfer(user1Addr, amount * 2n);
      
      // Approve bridge
      await nodeToken.connect(user1).approve(await bridgeRouter.getAddress(), amount);
      
      // Initiate transfer
      await bridgeRouter.connect(user1).initiateCrossChainTransfer(137, user2Addr, amount);
      
      // Check transfer exists
      const events = await bridgeRouter.queryFilter(bridgeRouter.filters.CrossChainTransferInitiated());
      expect(events.length).to.equal(1);
    });
  });

  describe("ValidatorNode", function () {
    it("Should deposit stake", async function () {
      const validatorAddr = await validator.getAddress();
      const stakeInfo = await validatorNode.getValidatorInfo(validatorAddr);
      expect(stakeInfo[0]).to.equal(ethers.parseEther("10"));
    });

    it("Should validate block", async function () {
      // Create a block first
      const amount = ethers.parseEther("50");
      const user1Addr = await user1.getAddress();
      const user2Addr = await user2.getAddress();
      
      await nodeToken.connect(deployer).transfer(user1Addr, amount * 2n);
      await nodeToken.connect(user1).createTransaction(user2Addr, amount);
      
      const pendingTxs = await nodeToken.getPendingTransactions();
      await nodeToken.connect(validator).submitBlock(ethers.toUtf8Bytes("Test"), pendingTxs);
      
      // Validate block
      await validatorNode.connect(validator).validateBlock(
        1,
        1,
        await nodeToken.getAddress()
      );
      
      const validation = await validatorNode.getValidation(1, 1);
      expect(validation[4]).to.be.true; // isValid
    });
  });
});