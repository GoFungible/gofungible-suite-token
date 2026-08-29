import { expect } from "chai";
import { ethers } from "hardhat";
import { JsonRpcSigner, ZeroAddress } from "ethers";
import { MockedERC7786Gateway } from "../typechain-types";
import { Fungible} from "../typechain-types/contracts/Fungible";
import { ERC7786MockGatewayRelayer } from "./relayer/ERC7786MockGatewayRelayer";
import { NO_SELECTOR, OnlyBindToEmptyTokenError, OnlyBindToSingletonChainError, selector, UNIVERSAL_ERRORS_ABI, waitForContractEvent } from "./_testhelper";

describe("ERC-20X Supply", function () {
	let owner1: JsonRpcSigner, relayer1: JsonRpcSigner, addr11: JsonRpcSigner, addr12: JsonRpcSigner, addr13: JsonRpcSigner, addrs1: JsonRpcSigner[];
	let owner2: JsonRpcSigner, relayer2: JsonRpcSigner, addr21: JsonRpcSigner, addr22: JsonRpcSigner, addr23: JsonRpcSigner, addrs2: JsonRpcSigner[];
	let fungibleMaster1: Fungible, fungibleSingleton1: Fungible, otherMaster1: Fungible, otherSlave1: Fungible, otherSingletonFat1: Fungible, mockedERC7786Gateway1: MockedERC7786Gateway;
	let fungibleMaster2: Fungible, fungibleSingleton2: Fungible, otherMaster2: Fungible, otherSlave2: Fungible, otherSingletonFat2: Fungible, mockedERC7786Gateway2: MockedERC7786Gateway;
	let relayer;

	/********************************************************************************************************/
	/************************************************** hooks ***********************************************/
	/********************************************************************************************************/
	before(async() => {
		console.log('*******************************');
		console.log(`\nTest Suite: ${this.title}`);
		console.log('*******************************');
		console.log(`Preparing bind test cases.`);

		// ***********************************************************************************************************************************************************
		// ************************************************************************** Reset Nodes ********************************************************************
		// ***********************************************************************************************************************************************************

    const node1Provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
		[owner1, relayer1, addr11, addr12, addr13, ...addrs1] = await node1Provider.listAccounts();
		await node1Provider.send("anvil_reset", []);
		[owner1, relayer1, addr11, addr12, addr13, ...addrs1].map(async (signer, index) => {
			const bal = await node1Provider.getBalance(signer.address);
			const net1 = await node1Provider.getNetwork();
			console.log(`Node1 ChainId ${net1.chainId} Accounts[${index}] (${signer.address}): ${ethers.formatEther(bal)}`);
		});
	
    const node2Provider = new ethers.JsonRpcProvider("http://127.0.0.1:8546");
		[owner2, relayer2, addr21, addr22, addr23, ...addrs2] = await node2Provider.listAccounts();
		await node2Provider.send("anvil_reset", []);
		[owner2, relayer2, addr21, addr22, addr23, ...addrs2].map(async (signer, index) => {
			const bal = await node2Provider.getBalance(signer.address);
			const net2 = await node2Provider.getNetwork();
			console.log(`Node2 ChainId ${net2.chainId} Accounts[${index}] (${signer.address}): ${ethers.formatEther(bal)}`);
		});

		for (const error of UNIVERSAL_ERRORS_ABI) {
			console.log(`${selector(error)} : ${error}`);
		}

		// ***********************************************************************************************************************************************************
		// ************************************************************************** Deploy Network *****************************************************************
		// ***********************************************************************************************************************************************************
		console.log(`Initializing network`);

		// deploy MockedERC7786Gateway1
		const MockedERC7786Gateway1 = await ethers.getContractFactory("MockedERC7786Gateway", owner1);
		mockedERC7786Gateway1 = await MockedERC7786Gateway1.deploy();
		expect(await mockedERC7786Gateway1.waitForDeployment()).to.not.be.reverted;
		expect(await mockedERC7786Gateway1.chainId()).to.equal(1111);
		const mockedERC7786GatewayAddress1 = await mockedERC7786Gateway1.getAddress();
		console.log(`MockedERC7786Gateway1 deployed on ${await mockedERC7786Gateway1.chainId()} at ${mockedERC7786GatewayAddress1}`);

		// deploy MockedERC7786Gateway1
		const MockedERC7786Gateway2 = await ethers.getContractFactory("MockedERC7786Gateway", owner2);
		mockedERC7786Gateway2 = await MockedERC7786Gateway2.deploy();
		expect(await mockedERC7786Gateway2.waitForDeployment()).to.not.be.reverted;
		expect(await mockedERC7786Gateway2.chainId()).to.equal(2222);
		const mockedERC7786GatewayAddress2 = await mockedERC7786Gateway2.getAddress();
		console.log(`MockedERC7786Gateway2 deployed on ${await mockedERC7786Gateway2.chainId()} at ${mockedERC7786GatewayAddress2}`);

		// launch relayer
		relayer = await new ERC7786MockGatewayRelayer(
			relayer1, relayer2, 
			"http://127.0.0.1:8545", "http://127.0.0.1:8546", 
			mockedERC7786GatewayAddress1, mockedERC7786GatewayAddress2
		);
		await relayer.init();
		await relayer.listenAndRelay();

		console.log(`Initialized network`);

		// ***********************************************************************************************************************************************************
		// ****************************************************************************** Deploy Tokens  *************************************************************
		// ***********************************************************************************************************************************************************
		// deploy FungibleMaster1
		const FungibleMaster1 = await ethers.getContractFactory("Fungible", owner1);
		fungibleMaster1 = await FungibleMaster1.deploy("FungibleMaster1Test", "FGT", 1000_000_000);
		expect(await fungibleMaster1.waitForDeployment()).to.not.be.reverted;
		const fungibleMasterAddress1 = await fungibleMaster1.getAddress();
		expect(await fungibleMaster1.chainId()).to.equal(1111);
		expect(await fungibleMaster1.setAsMasterChain()).to.not.be.reverted;
		expect(await fungibleMaster1.getMasterChain()).to.equal(1111);
		expect(await fungibleMaster1.getMasterAddress()).to.equal(fungibleMasterAddress1);
		console.log(`FungibleMaster1 deployed on ${await fungibleMaster1.chainId()} at ${fungibleMasterAddress1}`);

		// deploy FungibleSingleton1
		const FungibleSingleton1 = await ethers.getContractFactory("Fungible", owner1);
		fungibleSingleton1 = await FungibleSingleton1.deploy("FungibleSingleton1Test", "FGT", 0);
		expect(await fungibleSingleton1.waitForDeployment()).to.not.be.reverted;
		const fungibleSingletonAddress1 = await fungibleSingleton1.getAddress();
		expect(await fungibleSingleton1.chainId()).to.equal(1111);
		expect(await fungibleSingleton1.getMasterChain()).to.equal(0);
		expect(await fungibleSingleton1.getMasterAddress()).to.equal(ZeroAddress);
		console.log(`FungibleSingleton1 deployed on ${await fungibleSingleton1.chainId()} at ${fungibleSingletonAddress1}`);

		// deploy OtherMaster1
		const OtherMaster1 = await ethers.getContractFactory("Fungible", owner1);
		otherMaster1 = await OtherMaster1.deploy("OtherMaster1Test", "FGT", 1000_000_000);
		expect(await otherMaster1.waitForDeployment()).to.not.be.reverted;
		const otherMasterAddress1 = await otherMaster1.getAddress();
		expect(await otherMaster1.chainId()).to.equal(1111);
		expect(await otherMaster1.setAsMasterChain()).to.not.be.reverted;
		expect(await otherMaster1.getMasterChain()).to.equal(1111);
		expect(await otherMaster1.getMasterAddress()).to.equal(otherMasterAddress1);
		console.log(`OtherMaster1 deployed on ${await otherMaster1.chainId()} at ${otherMasterAddress1}`);

		// deploy OtherSlave1
		const OtherSlave1 = await ethers.getContractFactory("Fungible", owner1);
		otherSlave1 = await OtherSlave1.deploy("OtherSlave1Test", "FGT", 0);
		expect(await otherSlave1.waitForDeployment()).to.not.be.reverted;
		const otherSlaveAddress1 = await otherSlave1.getAddress();
		expect(await otherSlave1.chainId()).to.equal(1111);
		expect(await otherSlave1.getMasterChain()).to.equal(0);
		expect(await otherSlave1.getMasterAddress()).to.equal(ZeroAddress);
		console.log(`OtherSlave1 deployed on ${await otherSlave1.chainId()} at ${otherSlaveAddress1}`);

		// deploy OtherSingletonFat1 (has supply)
		const OtherSingletonFat1 = await ethers.getContractFactory("Fungible", owner1);
		otherSingletonFat1 = await OtherSingletonFat1.deploy("OtherSingletonFat1Test", "FGT", 10_000);
		expect(await otherSingletonFat1.waitForDeployment()).to.not.be.reverted;
		const otherSingletonFatAddress1 = await otherSingletonFat1.getAddress();
		expect(await otherSingletonFat1.chainId()).to.equal(1111);
		expect(await otherSingletonFat1.getMasterChain()).to.equal(0);
		expect(await otherSingletonFat1.getMasterAddress()).to.equal(ZeroAddress);
		console.log(`OtherSingletonFat1 deployed on ${await otherSingletonFat1.chainId()} at ${otherSingletonFatAddress1}`);

		// ***********************************************************************************************************************************************************
		// ******************************************************************** Deploy Tokens Hardhat1 Network *******************************************************
		// ***********************************************************************************************************************************************************
		// deploy FungibleMaster2
		const FungibleMaster2 = await ethers.getContractFactory("Fungible", owner2);
		fungibleMaster2 = await FungibleMaster2.deploy("FungibleMaster2Test", "FGT", 1000_000_000);
		expect(await fungibleMaster2.waitForDeployment()).to.not.be.reverted;
		const fungibleMasterAddress2 = await fungibleMaster2.getAddress();
		expect(await fungibleMaster2.chainId()).to.equal(2222);
		expect(await fungibleMaster2.setAsMasterChain()).to.not.be.reverted;
		expect(await fungibleMaster2.getMasterChain()).to.equal(2222);
		expect(await fungibleMaster2.getMasterAddress()).to.equal(fungibleMasterAddress2);
		console.log(`FungibleMaster2 deployed on ${await fungibleMaster2.chainId()} at ${fungibleMasterAddress2}`);

		// deploy FungibleSingleton2
		const FungibleSingleton2 = await ethers.getContractFactory("Fungible", owner2);
		fungibleSingleton2 = await FungibleSingleton2.deploy("FungibleSingleton2Test", "FGT", 0);
		expect(await fungibleSingleton2.waitForDeployment()).to.not.be.reverted;
		const fungibleSingletonAddress2 = await fungibleSingleton2.getAddress();
		expect(await fungibleSingleton2.chainId()).to.equal(2222);
		expect(await fungibleSingleton2.getMasterChain()).to.equal(0);
		expect(await fungibleSingleton2.getMasterAddress()).to.equal(ZeroAddress);
		console.log(`FungibleSingleton2 deployed on ${await fungibleSingleton2.chainId()} at ${fungibleSingletonAddress2}`);

		// deploy OtherMaster2
		const OtherMaster2 = await ethers.getContractFactory("Fungible", owner2);
		otherMaster2 = await OtherMaster2.deploy("OtherMaster2Test", "FGT", 1000_000_000);
		expect(await otherMaster2.waitForDeployment()).to.not.be.reverted;
		const otherMasterAddress2 = await otherMaster2.getAddress();
		expect(await otherMaster2.chainId()).to.equal(2222);
		expect(await otherMaster2.setAsMasterChain()).to.not.be.reverted;
		expect(await otherMaster2.getMasterChain()).to.equal(2222);
		expect(await otherMaster2.getMasterAddress()).to.equal(otherMasterAddress2);
		console.log(`OtherMaster2 deployed on ${await otherMaster2.chainId()} at ${otherMasterAddress2}`);

		// deploy FungibleSlave2
		const OtherSlave2 = await ethers.getContractFactory("Fungible", owner2);
		otherSlave2 = await OtherSlave2.deploy("FungibleSlave2Test", "FGT", 0);
		expect(await otherSlave2.waitForDeployment()).to.not.be.reverted;
		const otherSlaveAddress2 = await otherSlave2.getAddress();
		expect(await otherSlave2.chainId()).to.equal(2222);
		expect(await otherSlave2.getMasterChain()).to.equal(0);
		expect(await otherSlave2.getMasterAddress()).to.equal(ZeroAddress);
		console.log(`OtherSlave2 deployed on ${await otherSlave2.chainId()} at ${otherSlaveAddress2}`);

		// deploy OtherSingletonFat2 (has supply)
		const OtherSingletonFat2 = await ethers.getContractFactory("Fungible", owner2);
		otherSingletonFat2 = await OtherSingletonFat2.deploy("FungibleSingletonFat2Test", "FGT", 10_000);
		expect(await otherSingletonFat2.waitForDeployment()).to.not.be.reverted;
		const otherSingletonFatAddress2 = await otherSingletonFat2.getAddress();
		expect(await otherSingletonFat2.chainId()).to.equal(2222);
		expect(await otherSingletonFat2.getMasterChain()).to.equal(0);
		expect(await otherSingletonFat2.getMasterAddress()).to.equal(ZeroAddress);
		console.log(`OtherSingletonFat2 deployed on ${await otherSingletonFat2.chainId()} at ${otherSingletonFatAddress2}`);

		// ***********************************************************************************************************************************************************
		// *********************************************************************** Add Gateways **********************************************************************
		// ***********************************************************************************************************************************************************
		// TEST CASE: cannot bind if no gateways
		await expect(otherMaster1.bind(2222, otherSlaveAddress2)).to.be.revertedWithCustomError(otherMaster1, "GatewayRequired");
		await expect(otherMaster2.bind(1337, otherSlaveAddress1)).to.be.revertedWithCustomError(otherSlave1, "GatewayRequired");

		expect(await fungibleMaster1.addResource(0, 1, mockedERC7786GatewayAddress1, 1, 0, 0)).to.not.be.reverted;
		expect(await fungibleMaster1.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungibleMaster1.gateway()).to.equal(mockedERC7786GatewayAddress1);

		expect(await fungibleSingleton1.addResource(0, 1, mockedERC7786GatewayAddress1, 1, 0, 0)).to.not.be.reverted;
		expect(await fungibleSingleton1.releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		expect(await fungibleSingleton1.gateway()).to.equal(mockedERC7786GatewayAddress1);

		expect(await otherMaster1.addResource(0, 1, mockedERC7786GatewayAddress1, 1, 0, 0)).to.not.be.reverted;
		expect(await otherMaster1.releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		expect(await otherMaster1.gateway()).to.equal(mockedERC7786GatewayAddress1);

		expect(await otherSlave1.addResource(0, 1, mockedERC7786GatewayAddress1, 1, 0, 0)).to.not.be.reverted;
		expect(await otherSlave1.releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		expect(await otherSlave1.gateway()).to.equal(mockedERC7786GatewayAddress1);

		expect(await otherSingletonFat1.addResource(0, 1, mockedERC7786GatewayAddress1, 1, 0, 0)).to.not.be.reverted;
		expect(await otherSingletonFat1.releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		expect(await otherSingletonFat1.gateway()).to.equal(mockedERC7786GatewayAddress1);

		expect(await fungibleMaster2.addResource(0, 1, mockedERC7786GatewayAddress2, 1, 0, 0)).to.not.be.reverted;
		expect(await fungibleMaster2.releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		expect(await fungibleMaster2.gateway()).to.equal(mockedERC7786GatewayAddress2);

		expect(await fungibleSingleton2.addResource(0, 1, mockedERC7786GatewayAddress2, 1, 0, 0)).to.not.be.reverted;
		expect(await fungibleSingleton2.releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		expect(await fungibleSingleton2.gateway()).to.equal(mockedERC7786GatewayAddress2);

		expect(await otherMaster2.addResource(0, 1, mockedERC7786GatewayAddress2, 1, 0, 0)).to.not.be.reverted;
		expect(await otherMaster2.releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		expect(await otherMaster2.gateway()).to.equal(mockedERC7786GatewayAddress2);

		expect(await otherSlave2.addResource(0, 1, mockedERC7786GatewayAddress2, 1, 0, 0)).to.not.be.reverted;
		expect(await otherSlave2.releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		expect(await otherSlave2.gateway()).to.equal(mockedERC7786GatewayAddress2);

		expect(await otherSingletonFat2.addResource(0, 1, mockedERC7786GatewayAddress1, 1, 0, 0)).to.not.be.reverted;
		expect(await otherSingletonFat2.releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		expect(await otherSingletonFat2.gateway()).to.equal(mockedERC7786GatewayAddress1);

		// ***********************************************************************************************************************************************************
		// ******************************************** Mock otherMaster1 -> OtherSlave2 and otherMaster2 -> OtherSlave1 *********************************************
		// ***********************************************************************************************************************************************************
		// bind OtherMaster1 and OtherSlave2
		expect(await otherMaster1.bind(2222, otherSlaveAddress2)).to.not.be.reverted;
		expect(await waitForContractEvent({ contract: otherMaster1, eventName: "FungibleMessageCallbackProcessed" }).then(([sendId, selectorIfError]) => selectorIfError)).to.equal(NO_SELECTOR);
		expect(await otherMaster1.getChains()).to.include(2222n);
		expect(await otherMaster1.getChainAddress(2222)).to.equals(otherSlaveAddress2);
		expect(await otherSlave2.getMasterChain()).to.equal(1111);
		expect(await otherSlave2.getMasterAddress()).to.equal(otherMasterAddress1);

		// bind OtherMaster2 and OtherSlave1
		expect(await otherMaster2.bind(1111, otherSlaveAddress1)).to.not.be.reverted;
		expect(await waitForContractEvent({ contract: otherMaster2, eventName: "FungibleMessageCallbackProcessed" }).then(([sendId, selectorIfError]) => selectorIfError)).to.equal(NO_SELECTOR);
		expect(await otherMaster2.getChains()).to.include(1111n);
		expect(await otherMaster2.getChainAddress(1111)).to.equals(otherSlaveAddress1);
		expect(await otherSlave1.getMasterChain()).to.equal(2222);
		expect(await otherSlave1.getMasterAddress()).to.equal(otherMasterAddress2);

	});

	beforeEach(async function (this: Mocha.Context) {
		console.log(`\nTest: ${this.currentTest?.title}`);
		console.log('***************************************************************************');
	});

	afterEach(async() => {
		console.log('--------------------');
	});
	
	after(async() => {
		await relayer!.destroy();
		console.log(`--------- End Test Suite ${this.title}  --------`);
	});

  it("should communicate with two completely separate in-memory networks", async () => {
		// verify node1
		const node1Provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const net1 = await node1Provider.getNetwork();
    expect(Number(net1.chainId)).to.equal(1111);

		// verify node2
		const node2Provider = new ethers.JsonRpcProvider("http://127.0.0.1:8546");
    const net2 = await node2Provider.getNetwork();
    expect(Number(net2.chainId)).to.equal(2222);
  });

	/********************************************************************************************************/
	/************************************************ Addresses *********************************************/
	/********************************************************************************************************/
	it("Should be able to get cross addresses", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1);
		//fungible1.getAllRemoteSupplies();
	});

	/********************************************************************************************************/
	/**************************************** Bind - Sender Test Cases **************************************/
	/********************************************************************************************************/
	it("FROM. Only owner can bind.", async() => {
		await expect(fungibleMaster1.connect(addr13).bind(2222, fungibleSingleton2.getAddress())).to.be.revertedWithCustomError(fungibleMaster1, "OnlyOwner");
		await expect(fungibleMaster2.connect(addr13).bind(1111, fungibleSingleton1.getAddress())).to.be.revertedWithCustomError(fungibleMaster2, "OnlyOwner");
	});

	it("FROM. Should only bind from MasterToken.", async() => {
		await expect(fungibleSingleton1.bind(2222, fungibleMaster2)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindFromMasterToken");
		await expect(fungibleSingleton1.bind(2222, fungibleSingleton2)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindFromMasterToken");
		await expect(fungibleSingleton1.bind(2222, otherMaster2)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindFromMasterToken");
		await expect(fungibleSingleton1.bind(2222, otherSlave2)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindFromMasterToken");
		await expect(fungibleSingleton1.bind(2222, otherSingletonFat2)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindFromMasterToken");

		await expect(otherSlave1.bind(2222, fungibleMaster2)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindFromMasterToken");
		await expect(otherSlave1.bind(2222, fungibleSingleton2)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindFromMasterToken");
		await expect(otherSlave1.bind(2222, otherMaster2)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindFromMasterToken");
		await expect(otherSlave1.bind(2222, otherSlave2)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindFromMasterToken");
		await expect(otherSlave1.bind(2222, otherSingletonFat2)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindFromMasterToken");

		await expect(otherSingletonFat1.bind(2222, fungibleMaster2)).to.be.revertedWithCustomError(otherSingletonFat1, "OnlyBindFromMasterToken");
		await expect(otherSingletonFat1.bind(2222, fungibleSingleton2)).to.be.revertedWithCustomError(otherSingletonFat1, "OnlyBindFromMasterToken");
		await expect(otherSingletonFat1.bind(2222, otherMaster2)).to.be.revertedWithCustomError(otherSingletonFat1, "OnlyBindFromMasterToken");
		await expect(otherSingletonFat1.bind(2222, otherSlave2)).to.be.revertedWithCustomError(otherSingletonFat1, "OnlyBindFromMasterToken");	
		await expect(otherSingletonFat1.bind(2222, otherSingletonFat2)).to.be.revertedWithCustomError(otherSingletonFat1, "OnlyBindFromMasterToken");

		await expect(fungibleSingleton2.bind(1111, fungibleMaster1)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindFromMasterToken");
		await expect(fungibleSingleton2.bind(1111, fungibleSingleton1)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindFromMasterToken");
		await expect(fungibleSingleton2.bind(1111, otherMaster1)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindFromMasterToken");
		await expect(fungibleSingleton2.bind(1111, otherSlave1)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindFromMasterToken");
		await expect(fungibleSingleton2.bind(1111, otherSingletonFat1)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindFromMasterToken");

		await expect(otherSlave2.bind(1111, fungibleMaster1)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindFromMasterToken");
		await expect(otherSlave2.bind(1111, fungibleSingleton1)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindFromMasterToken");
		await expect(otherSlave2.bind(1111, otherMaster1)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindFromMasterToken");
		await expect(otherSlave2.bind(1111, otherSlave1)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindFromMasterToken");		
		await expect(otherSlave2.bind(1111, otherSingletonFat1)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindFromMasterToken");		

		await expect(otherSingletonFat2.bind(1111, fungibleMaster1)).to.be.revertedWithCustomError(otherSingletonFat2, "OnlyBindFromMasterToken");
		await expect(otherSingletonFat2.bind(1111, fungibleSingleton1)).to.be.revertedWithCustomError(otherSingletonFat2, "OnlyBindFromMasterToken");
		await expect(otherSingletonFat2.bind(1111, otherMaster1)).to.be.revertedWithCustomError(otherSingletonFat2, "OnlyBindFromMasterToken");
		await expect(otherSingletonFat2.bind(1111, otherSlave1)).to.be.revertedWithCustomError(otherSingletonFat2, "OnlyBindFromMasterToken");	
		await expect(otherSingletonFat2.bind(1111, otherSingletonFat1)).to.be.revertedWithCustomError(otherSingletonFat2, "OnlyBindFromMasterToken");
	});

	it("FROM. Can only bind to other chain", async() => {
		await expect(fungibleMaster1.bind(1111, fungibleMaster1.getAddress())).to.be.revertedWithCustomError(fungibleMaster1, "OnlyBindToOtherChain");
		await expect(fungibleMaster1.bind(1111, fungibleSingleton1)).to.be.revertedWithCustomError(fungibleMaster1, "OnlyBindToOtherChain");
		await expect(fungibleMaster1.bind(1111, otherMaster1)).to.be.revertedWithCustomError(fungibleMaster1, "OnlyBindToOtherChain");
		await expect(fungibleMaster1.bind(1111, otherSlave1)).to.be.revertedWithCustomError(fungibleMaster1, "OnlyBindToOtherChain");
		await expect(fungibleMaster1.bind(1111, otherSingletonFat1)).to.be.revertedWithCustomError(fungibleMaster1, "OnlyBindToOtherChain");

		await expect(fungibleSingleton1.bind(1111, fungibleMaster1)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindToOtherChain");
		await expect(fungibleSingleton1.bind(1111, fungibleSingleton1)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindToOtherChain");
		await expect(fungibleSingleton1.bind(1111, otherMaster1)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindToOtherChain");
		await expect(fungibleSingleton1.bind(1111, otherSlave1)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindToOtherChain");
		await expect(fungibleSingleton1.bind(1111, otherSingletonFat1)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindToOtherChain");

		await expect(otherMaster1.bind(1111, fungibleMaster1)).to.be.revertedWithCustomError(otherMaster1, "OnlyBindToOtherChain");
		await expect(otherMaster1.bind(1111, fungibleSingleton1)).to.be.revertedWithCustomError(otherMaster1, "OnlyBindToOtherChain");
		await expect(otherMaster1.bind(1111, otherMaster1)).to.be.revertedWithCustomError(otherMaster1, "OnlyBindToOtherChain");
		await expect(otherMaster1.bind(1111, otherSlave1)).to.be.revertedWithCustomError(otherMaster1, "OnlyBindToOtherChain");
		await expect(otherMaster1.bind(1111, otherSingletonFat1)).to.be.revertedWithCustomError(otherMaster1, "OnlyBindToOtherChain");

		await expect(otherSlave1.bind(1111, fungibleMaster1)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindToOtherChain");
		await expect(otherSlave1.bind(1111, fungibleSingleton1)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindToOtherChain");
		await expect(otherSlave1.bind(1111, otherMaster1)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindToOtherChain");
		await expect(otherSlave1.bind(1111, otherSlave1)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindToOtherChain");
		await expect(otherSlave1.bind(1111, otherSingletonFat1)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindToOtherChain");

		await expect(otherSingletonFat1.bind(1111, fungibleMaster1)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindToOtherChain");
		await expect(otherSingletonFat1.bind(1111, fungibleSingleton1)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindToOtherChain");
		await expect(otherSingletonFat1.bind(1111, otherMaster1)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindToOtherChain");
		await expect(otherSingletonFat1.bind(1111, otherSlave1)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindToOtherChain");
		await expect(otherSingletonFat1.bind(1111, otherSingletonFat1)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindToOtherChain");

		await expect(fungibleMaster2.bind(2222, fungibleMaster2.getAddress())).to.be.revertedWithCustomError(fungibleMaster2, "OnlyBindToOtherChain");
		await expect(fungibleMaster2.bind(2222, fungibleSingleton2)).to.be.revertedWithCustomError(fungibleMaster2, "OnlyBindToOtherChain");
		await expect(fungibleMaster2.bind(2222, otherMaster2)).to.be.revertedWithCustomError(fungibleMaster2, "OnlyBindToOtherChain");
		await expect(fungibleMaster2.bind(2222, otherSlave1)).to.be.revertedWithCustomError(fungibleMaster2, "OnlyBindToOtherChain");
		await expect(fungibleMaster2.bind(2222, otherSingletonFat2)).to.be.revertedWithCustomError(fungibleMaster2, "OnlyBindToOtherChain");

		await expect(fungibleSingleton2.bind(2222, fungibleMaster2)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindToOtherChain");
		await expect(fungibleSingleton2.bind(2222, fungibleSingleton2)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindToOtherChain");
		await expect(fungibleSingleton2.bind(2222, otherMaster2)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindToOtherChain");
		await expect(fungibleSingleton2.bind(2222, otherSlave1)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindToOtherChain");
		await expect(fungibleSingleton2.bind(2222, otherSingletonFat2)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindToOtherChain");

		await expect(otherMaster2.bind(2222, fungibleMaster2)).to.be.revertedWithCustomError(otherMaster2, "OnlyBindToOtherChain");
		await expect(otherMaster2.bind(2222, fungibleSingleton2)).to.be.revertedWithCustomError(otherMaster2, "OnlyBindToOtherChain");
		await expect(otherMaster2.bind(2222, otherMaster2)).to.be.revertedWithCustomError(otherMaster2, "OnlyBindToOtherChain");
		await expect(otherMaster2.bind(2222, otherSlave1)).to.be.revertedWithCustomError(otherMaster2, "OnlyBindToOtherChain");
		await expect(otherMaster2.bind(2222, otherSingletonFat2)).to.be.revertedWithCustomError(otherMaster2, "OnlyBindToOtherChain");

		await expect(otherSlave2.bind(2222, fungibleMaster2)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindToOtherChain");
		await expect(otherSlave2.bind(2222, fungibleSingleton2)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindToOtherChain");
		await expect(otherSlave2.bind(2222, otherMaster2)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindToOtherChain");
		await expect(otherSlave2.bind(2222, otherSlave2)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindToOtherChain");
		await expect(otherSlave2.bind(2222, otherSingletonFat2)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindToOtherChain");

		await expect(otherSingletonFat2.bind(2222, fungibleMaster2)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindToOtherChain");
		await expect(otherSingletonFat2.bind(2222, fungibleSingleton2)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindToOtherChain");
		await expect(otherSingletonFat2.bind(2222, otherMaster2)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindToOtherChain");
		await expect(otherSingletonFat2.bind(2222, otherSlave2)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindToOtherChain");
		await expect(otherSingletonFat2.bind(2222, otherSingletonFat2)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindToOtherChain");
	});

	it("TO. Should only bind to Unbound chains.", async() => {
		await expect(otherMaster1.bind(2222, fungibleSingleton2)).to.be.revertedWithCustomError(otherMaster1, "OnlyBindToUnboundChain");
		await expect(otherMaster2.bind(1111, fungibleSingleton1)).to.be.revertedWithCustomError(otherMaster2, "OnlyBindToUnboundChain");
	});

	/********************************************************************************************************/
	/**************************************** Bind - Receiver Test Cases ************************************/
	/********************************************************************************************************/
	it("TO. Should only bind to SingletonToken.", async() => {
		const [id1] = (await fungibleMaster1.bind(2222, fungibleMaster2, { gasLimit: 500000n }).then(tx => tx.wait()))?.logs.map(log => fungibleMaster1.interface.parseLog(log)).filter(l => l?.name === 'FungibleMessageSent').map(l => l?.args[0]) ?? [];
		expect(await waitForContractEvent({ contract: fungibleMaster1, eventName: "FungibleMessageCallbackProcessed", filterPredicate: (_id) => id1==_id }).then(([id , selectorIfError]) => selectorIfError)).to.equal(selector(OnlyBindToSingletonChainError));
		const [id2] = (await fungibleMaster1.bind(2222, otherMaster2, { gasLimit: 500000n }).then(tx => tx.wait()))?.logs.map(log => fungibleMaster1.interface.parseLog(log)).filter(l => l?.name === 'FungibleMessageSent').map(l => l?.args[0]) ?? [];
		expect(await waitForContractEvent({ contract: fungibleMaster1, eventName: "FungibleMessageCallbackProcessed", filterPredicate: (_id) => id2==_id }).then(([id , selectorIfError]) => selectorIfError)).to.equal(selector(OnlyBindToSingletonChainError));
		const [id3] = (await fungibleMaster1.bind(2222, otherSlave2, { gasLimit: 500000n }).then(tx => tx.wait()))?.logs.map(log => fungibleMaster1.interface.parseLog(log)).filter(l => l?.name === 'FungibleMessageSent').map(l => l?.args[0]) ?? [];
		expect(await waitForContractEvent({ contract: fungibleMaster1, eventName: "FungibleMessageCallbackProcessed", filterPredicate: (_id) => id3==_id }).then(([id , selectorIfError]) => selectorIfError)).to.equal(selector(OnlyBindToSingletonChainError));

		const [id4] = (await fungibleMaster2.bind(1111, fungibleMaster1, { gasLimit: 500000n }).then(tx => tx.wait()))?.logs.map(log => fungibleMaster2.interface.parseLog(log)).filter(l => l?.name === 'FungibleMessageSent').map(l => l?.args[0]) ?? [];
		expect(await waitForContractEvent({ contract: fungibleMaster2, eventName: "FungibleMessageCallbackProcessed", filterPredicate: (_id) => id4==_id }).then(([id , selectorIfError]) => selectorIfError)).to.equal(selector(OnlyBindToSingletonChainError));
		const [id5] = (await fungibleMaster2.bind(1111, otherMaster1, { gasLimit: 500000n }).then(tx => tx.wait()))?.logs.map(log => fungibleMaster2.interface.parseLog(log)).filter(l => l?.name === 'FungibleMessageSent').map(l => l?.args[0]) ?? [];
		expect(await waitForContractEvent({ contract: fungibleMaster2, eventName: "FungibleMessageCallbackProcessed", filterPredicate: (_id) => id5==_id }).then(([id , selectorIfError]) => selectorIfError)).to.equal(selector(OnlyBindToSingletonChainError));
		const [id6] = (await fungibleMaster2.bind(1111, otherSlave1, { gasLimit: 500000n }).then(tx => tx.wait()))?.logs.map(log => fungibleMaster2.interface.parseLog(log)).filter(l => l?.name === 'FungibleMessageSent').map(l => l?.args[0]) ?? [];
		expect(await waitForContractEvent({ contract: fungibleMaster2, eventName: "FungibleMessageCallbackProcessed", filterPredicate: (_id) => id6==_id }).then(([id , selectorIfError]) => selectorIfError)).to.equal(selector(OnlyBindToSingletonChainError));
	});

	it("TO. Should only bind to Empty Tokens.", async() => {
		const [id1] = (await fungibleMaster1.bind(2222, otherSingletonFat2, { gasLimit: 500000n }).then(tx => tx.wait()))?.logs.map(log => fungibleMaster1.interface.parseLog(log)).filter(l => l?.name === 'FungibleMessageSent').map(l => l?.args[0]) ?? [];
		expect(await waitForContractEvent({ contract: fungibleMaster1, eventName: "FungibleMessageCallbackProcessed", filterPredicate: (_id) => id1==_id }).then(([id , selectorIfError]) => selectorIfError)).to.equal(selector(OnlyBindToEmptyTokenError));
		const [id2] = (await fungibleMaster2.bind(1111, otherSingletonFat1, { gasLimit: 500000n }).then(tx => tx.wait()))?.logs.map(log => fungibleMaster2.interface.parseLog(log)).filter(l => l?.name === 'FungibleMessageSent').map(l => l?.args[0]) ?? [];
		expect(await waitForContractEvent({ contract: fungibleMaster2, eventName: "FungibleMessageCallbackProcessed", filterPredicate: (_id) => id2==_id }).then(([id , selectorIfError]) => selectorIfError)).to.equal(selector(OnlyBindToEmptyTokenError));
	});

	it.skip("OK. Should be able to bind if conditions met.", async() => {
		expect(await fungibleMaster1.bind(2222, fungibleSingleton2)).to.not.be.reverted;
		expect(await waitForContractEvent({ contract: fungibleMaster1, eventName: "FungibleMessageCallbackProcessed" }).then(([sendId, selectorIfError]) => selectorIfError)).to.equal(NO_SELECTOR);
		expect(await fungibleMaster1.getChains()).to.include(2222n);
		expect(await fungibleMaster1.getChainAddress(2222)).to.equals(fungibleSingleton2);
		expect(await fungibleSingleton2.getMasterChain()).to.equal(1111);
		expect(await fungibleSingleton2.getMasterAddress()).to.equal(fungibleMaster1);

		expect(await fungibleMaster2.bind(1111, fungibleSingleton1)).to.not.be.reverted;
		expect(await waitForContractEvent({ contract: fungibleMaster2, eventName: "FungibleMessageCallbackProcessed" }).then(([sendId, selectorIfError]) => selectorIfError)).to.equal(NO_SELECTOR);
		expect(await fungibleMaster2.getChains()).to.include(1111n);
		expect(await fungibleMaster2.getChainAddress(1111)).to.equals(fungibleSingleton1);
		expect(await fungibleSingleton1.getMasterChain()).to.equal(2222);
		expect(await fungibleSingleton1.getMasterAddress()).to.equal(fungibleMaster2);
	});

	/********************************************************************************************************/
	/************************************************** Unbind **********************************************/
	/********************************************************************************************************/
	it("FROM. Only owner can unbind.", async() => {
		await expect(otherMaster1.connect(addr13).unbind(2222)).to.be.revertedWithCustomError(otherMaster1, "OnlyOwner");
		await expect(otherMaster2.connect(addr13).unbind(1111)).to.be.revertedWithCustomError(otherMaster1, "OnlyOwner");
	});

	it.skip("FROM. Should only unbind from MasterChain token.", async() => {
		await expect(otherSlave2.unbind(1111)).to.be.revertedWithCustomError(otherMaster1, "OnlyUnbindFromMasterChain");
		await expect(otherSlave1.unbind(2222)).to.be.revertedWithCustomError(otherMaster1, "OnlyUnbindFromMasterChain");
	});

	it.skip("FROM. Should only unbind from other token.", async() => {
		await expect(otherMaster1.unbind(1111)).to.be.revertedWithCustomError(otherMaster1, "OnlyUnbindFromOtherChain");
		await expect(otherMaster2.unbind(2222)).to.be.revertedWithCustomError(otherMaster1, "OnlyUnbindFromOtherChain");
	});

	it.skip("FROM. Should only unbind from bound token.", async() => {
		await expect(otherMaster1.unbind(3333)).to.be.revertedWithCustomError(otherMaster1, "OnlyUnbindFromOtherChain");
		await expect(otherMaster2.unbind(3333)).to.be.revertedWithCustomError(otherMaster1, "OnlyUnbindFromOtherChain");
	});

	it("TO. Should only unbind Slave empty tokens.", async() => {

	});

	it.skip("OK. Should be able to unbind if conditions met.", async() => {
		await expect(otherMaster1.unbind(2222)).to.not.be.reverted;
		expect(await otherMaster1.getChains()).to.not.include(2222n);
		expect(await otherMaster1.getChainAddress(2222)).to.equals(ZeroAddress);
		expect(await otherSlave2.getMasterChain()).to.equal(0);
		expect(await otherSlave2.getMasterAddress()).to.equal(ZeroAddress);

		await expect(otherMaster2.unbind(1111)).to.not.be.reverted;
		expect(await otherMaster2.getChains()).to.not.include(1111n);
		expect(await otherMaster2.getChainAddress(1111)).to.equals(ZeroAddress);
		expect(await otherSlave1.getMasterChain()).to.equal(0);
		expect(await otherSlave1.getMasterAddress()).to.equal(ZeroAddress);
	});

	/********************************************************************************************************/
	/******************************************** Transfer MasterChain **************************************/
	/********************************************************************************************************/
	it.skip("Should be able to transfer master chain status", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
	});

});