import { expect } from "chai";
import { ethers } from "hardhat";
import { JsonRpcSigner, ZeroAddress } from "ethers";
import { MockedERC7786Gateway } from "../typechain-types";
import { Fungible} from "../typechain-types/contracts/Fungible";
import { ERC7786MockGatewayRelayer } from "./relayer/ERC7786MockGatewayRelayer";
import { NO_SELECTOR, OnlyBindToSingletonChainError, selector, UNIVERSAL_ERRORS_ABI, waitForContractEvent } from "./_testhelper";

describe("ERC-20X Supply", function () {
	let owner1: JsonRpcSigner, relayer1: JsonRpcSigner, addr11: JsonRpcSigner, addr12: JsonRpcSigner, addr13: JsonRpcSigner, addrs1: JsonRpcSigner[];
	let owner2: JsonRpcSigner, relayer2: JsonRpcSigner, addr21: JsonRpcSigner, addr22: JsonRpcSigner, addr23: JsonRpcSigner, addrs2: JsonRpcSigner[];
	let fungibleMaster1: Fungible, fungibleSingleton1: Fungible, otherMaster1: Fungible, otherSlave1: Fungible, mockedERC7786Gateway1: MockedERC7786Gateway;
	let fungibleMaster2: Fungible, fungibleSingleton2: Fungible, otherMaster2: Fungible, otherSlave2: Fungible, mockedERC7786Gateway2: MockedERC7786Gateway;

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
		const relayer = await new ERC7786MockGatewayRelayer(
			relayer1, relayer2, 
			"http://127.0.0.1:8545", "http://127.0.0.1:8546", 
			mockedERC7786GatewayAddress1, mockedERC7786GatewayAddress2
		).init();
		relayer.listenAndRelay();

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

		// ***********************************************************************************************************************************************************
		// *********************************************************************** Add Gateways **********************************************************************
		// ***********************************************************************************************************************************************************
		// TEST CASE: cannot bind if no gateways
		await expect(otherMaster1.bindChain(2222, otherSlaveAddress2)).to.be.revertedWithCustomError(otherMaster1, "GatewayRequired");
		await expect(otherMaster2.bindChain(1337, otherSlaveAddress1)).to.be.revertedWithCustomError(otherSlave1, "GatewayRequired");

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

		// ***********************************************************************************************************************************************************
		// ******************************************** Mock otherMaster1 -> OtherSlave2 and otherMaster2 -> OtherSlave1 *********************************************
		// ***********************************************************************************************************************************************************
		// bind OtherMaster1 and OtherSlave2
		expect(await otherMaster1.bindChain(2222, otherSlaveAddress2)).to.not.be.reverted;
		expect(await waitForContractEvent({ contract: otherMaster1, eventName: "FungibleMessageCallback" }).then(([sendId, selectorIfError]) => selectorIfError)).to.equal(NO_SELECTOR);
		expect(await otherSlave2.getMasterChain()).to.equal(1111);
		expect(await otherSlave2.getMasterAddress()).to.equal(otherMasterAddress1);

		// bind OtherMaster2 and OtherSlave1
		expect(await otherMaster2.bindChain(1111, otherSlaveAddress1)).to.not.be.reverted;
		expect(await waitForContractEvent({ contract: otherMaster2, eventName: "FungibleMessageCallback" }).then(([sendId, selectorIfError]) => selectorIfError)).to.equal(NO_SELECTOR);
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
	/**************************************** Bind - Sender Test Cases **************************************/
	/********************************************************************************************************/
	it("WHO. Only owner can bind.", async() => {
		await expect(fungibleMaster1.connect(addr13).bindChain(2222, fungibleSingleton2.getAddress())).to.be.revertedWithCustomError(fungibleMaster1, "OnlyOwner");
		await expect(fungibleMaster2.connect(addr13).bindChain(1111, fungibleSingleton1.getAddress())).to.be.revertedWithCustomError(fungibleMaster2, "OnlyOwner");
	});

	it("FROM. Can only bind to other chain", async() => {
		await expect(fungibleMaster1.bindChain(1111, fungibleMaster1.getAddress())).to.be.revertedWithCustomError(fungibleMaster1, "OnlyBindToOtherChain");
		await expect(fungibleMaster1.bindChain(1111, fungibleSingleton1)).to.be.revertedWithCustomError(fungibleMaster1, "OnlyBindToOtherChain");
		await expect(fungibleMaster1.bindChain(1111, otherMaster1)).to.be.revertedWithCustomError(fungibleMaster1, "OnlyBindToOtherChain");
		await expect(fungibleMaster1.bindChain(1111, otherSlave1)).to.be.revertedWithCustomError(fungibleMaster1, "OnlyBindToOtherChain");

		await expect(fungibleSingleton1.bindChain(1111, fungibleMaster1)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindToOtherChain");
		await expect(fungibleSingleton1.bindChain(1111, fungibleSingleton1)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindToOtherChain");
		await expect(fungibleSingleton1.bindChain(1111, otherMaster1)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindToOtherChain");
		await expect(fungibleSingleton1.bindChain(1111, otherSlave1)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindToOtherChain");

		await expect(otherMaster1.bindChain(1111, fungibleMaster1)).to.be.revertedWithCustomError(otherMaster1, "OnlyBindToOtherChain");
		await expect(otherMaster1.bindChain(1111, fungibleSingleton1)).to.be.revertedWithCustomError(otherMaster1, "OnlyBindToOtherChain");
		await expect(otherMaster1.bindChain(1111, otherMaster1)).to.be.revertedWithCustomError(otherMaster1, "OnlyBindToOtherChain");
		await expect(otherMaster1.bindChain(1111, otherSlave1)).to.be.revertedWithCustomError(otherMaster1, "OnlyBindToOtherChain");

		await expect(otherSlave1.bindChain(1111, fungibleMaster1)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindToOtherChain");
		await expect(otherSlave1.bindChain(1111, fungibleSingleton1)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindToOtherChain");
		await expect(otherSlave1.bindChain(1111, otherMaster1)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindToOtherChain");
		await expect(otherSlave1.bindChain(1111, otherSlave1)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindToOtherChain");

		await expect(fungibleMaster2.bindChain(2222, fungibleMaster2.getAddress())).to.be.revertedWithCustomError(fungibleMaster2, "OnlyBindToOtherChain");
		await expect(fungibleMaster2.bindChain(2222, fungibleSingleton2)).to.be.revertedWithCustomError(fungibleMaster2, "OnlyBindToOtherChain");
		await expect(fungibleMaster2.bindChain(2222, otherMaster2)).to.be.revertedWithCustomError(fungibleMaster2, "OnlyBindToOtherChain");
		await expect(fungibleMaster2.bindChain(2222, otherSlave1)).to.be.revertedWithCustomError(fungibleMaster2, "OnlyBindToOtherChain");

		await expect(fungibleSingleton2.bindChain(2222, fungibleMaster2)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindToOtherChain");
		await expect(fungibleSingleton2.bindChain(2222, fungibleSingleton2)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindToOtherChain");
		await expect(fungibleSingleton2.bindChain(2222, otherMaster2)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindToOtherChain");
		await expect(fungibleSingleton2.bindChain(2222, otherSlave1)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindToOtherChain");

		await expect(otherMaster2.bindChain(2222, fungibleMaster2)).to.be.revertedWithCustomError(otherMaster2, "OnlyBindToOtherChain");
		await expect(otherMaster2.bindChain(2222, fungibleSingleton2)).to.be.revertedWithCustomError(otherMaster2, "OnlyBindToOtherChain");
		await expect(otherMaster2.bindChain(2222, otherMaster2)).to.be.revertedWithCustomError(otherMaster2, "OnlyBindToOtherChain");
		await expect(otherMaster2.bindChain(2222, otherSlave1)).to.be.revertedWithCustomError(otherMaster2, "OnlyBindToOtherChain");

		await expect(otherSlave2.bindChain(2222, fungibleMaster2)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindToOtherChain");
		await expect(otherSlave2.bindChain(2222, fungibleSingleton2)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindToOtherChain");
		await expect(otherSlave2.bindChain(2222, otherMaster2)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindToOtherChain");
		await expect(otherSlave2.bindChain(2222, otherSlave2)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindToOtherChain");
	});

	it("FROM. Should only bind from MasterChain.", async() => {
		await expect(fungibleSingleton1.bindChain(2222, fungibleMaster2)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindFromMasterChain");
		await expect(fungibleSingleton1.bindChain(2222, fungibleSingleton2)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindFromMasterChain");
		await expect(fungibleSingleton1.bindChain(2222, otherMaster2)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindFromMasterChain");
		await expect(fungibleSingleton1.bindChain(2222, otherSlave2)).to.be.revertedWithCustomError(fungibleSingleton1, "OnlyBindFromMasterChain");

		await expect(otherSlave1.bindChain(2222, fungibleMaster2)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindFromMasterChain");
		await expect(otherSlave1.bindChain(2222, fungibleSingleton2)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindFromMasterChain");
		await expect(otherSlave1.bindChain(2222, otherMaster2)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindFromMasterChain");
		await expect(otherSlave1.bindChain(2222, otherSlave2)).to.be.revertedWithCustomError(otherSlave1, "OnlyBindFromMasterChain");		

		await expect(fungibleSingleton2.bindChain(1111, fungibleMaster1)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindFromMasterChain");
		await expect(fungibleSingleton2.bindChain(1111, fungibleSingleton1)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindFromMasterChain");
		await expect(fungibleSingleton2.bindChain(1111, otherMaster1)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindFromMasterChain");
		await expect(fungibleSingleton2.bindChain(1111, otherSlave1)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyBindFromMasterChain");

		await expect(otherSlave2.bindChain(1111, fungibleMaster1)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindFromMasterChain");
		await expect(otherSlave2.bindChain(1111, fungibleSingleton1)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindFromMasterChain");
		await expect(otherSlave2.bindChain(1111, otherMaster1)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindFromMasterChain");
		await expect(otherSlave2.bindChain(1111, otherSlave1)).to.be.revertedWithCustomError(otherSlave2, "OnlyBindFromMasterChain");		
	});

	/********************************************************************************************************/
	/**************************************** Bind - Receiver Test Cases ************************************/
	/********************************************************************************************************/
	it("TO. Should only bind to SingletonChain.", async() => {

		//expect(await fungibleMaster1.bindChain(2222, fungibleMaster2)).to.not.be.reverted;
		// should get the id of the message to filter
		const [id] = (await fungibleMaster1.bindChain(2222, fungibleMaster2, { gasLimit: 5000000 }).then(tx => tx.wait()))?.logs.map(log => fungibleMaster1.interface.parseLog(log)).filter(l => l?.name === 'FungibleMessageSent').map(l => l?.args[0]) ?? [];
		console.log("[3] ******************** id: ******************", id);
		//expect(await waitForContractEvent({ contract: fungibleMaster2, eventName: "FungibleMessageCallback" }).then(([sendId, selectorIfError]) => selectorIfError)).to.equal(selector(OnlyBindToSingletonChainError));

		// track also receiver filtering by id
		//expect(await waitForContractEvent({ contract: fungibleMaster2, eventName: "FungibleMessageCallback" }).then(([sendId, selectorIfError]) => selectorIfError)).to.equal(selector(OnlyBindToSingletonChainError));
		//expect(await waitForContractEvent({ contract: fungibleMaster2, eventName: "FungibleMessageCallback" }).then(([sendId, selectorIfError]) => selectorIfError)).to.equal(selector(OnlyBindToSingletonChainError));
		// track response filtering by id
		//expect(await waitForContractEvent({ contract: fungibleMaster1, eventName: "FungibleMessageCallback" }).then(([sendId, selectorIfError]) => selectorIfError)).to.equal(selector(OnlyBindToSingletonChainError));

		//expect(await waitForContractEvent({ contract: fungibleMaster1, eventName: "FungibleMessageCallback" }).then(([sendId, selectorIfError]) => selectorIfError)).to.equal(selector(OnlyBindToSingletonChainError));
		/*await expect(fungibleMaster1.bindChain(2222, otherMaster2)).to.be.revertedWithCustomError(fungibleMaster1, "OnlyBindToSingletonChain");
		await expect(fungibleMaster1.bindChain(2222, otherSlave2)).to.be.revertedWithCustomError(fungibleMaster1, "OnlyBindToSingletonChain");

		await expect(otherMaster1.bindChain(2222, fungibleMaster2)).to.be.revertedWithCustomError(otherMaster1, "OnlyBindToSingletonChain");
		await expect(otherMaster1.bindChain(2222, otherMaster2)).to.be.revertedWithCustomError(otherMaster1, "OnlyBindToSingletonChain");
		await expect(otherMaster1.bindChain(2222, otherSlave2)).to.be.revertedWithCustomError(otherMaster1, "OnlyBindToSingletonChain");

		await expect(fungibleMaster2.bindChain(1111, fungibleMaster2)).to.be.revertedWithCustomError(fungibleMaster2, "OnlyBindToSingletonChain");
		await expect(fungibleMaster2.bindChain(1111, otherMaster2)).to.be.revertedWithCustomError(fungibleMaster2, "OnlyBindToSingletonChain");
		await expect(fungibleMaster2.bindChain(1111, otherSlave2)).to.be.revertedWithCustomError(fungibleMaster2, "OnlyBindToSingletonChain");

		await expect(otherMaster2.bindChain(1111, fungibleMaster2)).to.be.revertedWithCustomError(otherMaster2, "OnlyBindToSingletonChain");
		await expect(otherMaster2.bindChain(1111, otherMaster2)).to.be.revertedWithCustomError(otherMaster2, "OnlyBindToSingletonChain");
		await expect(otherMaster2.bindChain(1111, otherSlave2)).to.be.revertedWithCustomError(otherMaster2, "OnlyBindToSingletonChain");*/
	});

	it("TO. Should only bind to Unbound chains.", async() => {

	});

	/*it.skip("OK. Should be able to bind if conditions met.", async() => {
		// Tokens
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)

		// set Fungible1 as MasterChain
		expect(await fungible1.getMasterChain()).to.equal(0);
		await expect(fungible1.setAsMasterChain()).to.not.be.reverted;
		expect(await fungible1.getMasterChain()).to.equal(await fungible1.chainId());
		console.log(`Fungible1 ${await fungible1.chainId()} set as MasterChain`);

		// set gateway to Fungible1
		await expect(fungible1.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible1.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible1.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible1.gateway()) + " attached to Fungible1.");

		// set gateway to Fungible2
		await expect(fungible2.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible2.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible2.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible2.gateway()) + " attached to Fungible2.");

		// bind Fungible2 to Fungible1
		expect(await fungible1.bindChain(1337, fungibleAddress2)).to.not.be.reverted;
		expect(await fungible2.getMasterChain()).to.equal(1337);
		expect(await fungible2.getMasterAddress()).to.equal(fungibleAddress1);
	});*/

	/*it.skip("TO. Should not bind a second token in the same chain.", async() => {
		// Tokens
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)
		const fungible3 = await ethers.getContractAt('Fungible', fungibleAddress3)

		// set Fungible1 as MasterChain
		expect(await fungible1.getMasterChain()).to.equal(0);
		await expect(fungible1.setAsMasterChain()).to.not.be.reverted;
		expect(await fungible1.getMasterChain()).to.equal(await fungible1.chainId());
		console.log(`Fungible1 ${await fungible1.chainId()} set as MasterChain`);

		// set gateway to Fungible1
		await expect(fungible1.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible1.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible1.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible1.gateway()) + " attached to Fungible1.");

		// set gateway to Fungible2
		await expect(fungible2.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible2.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible2.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible2.gateway()) + " attached to Fungible2.");

		// set gateway to Fungible3
		await expect(fungible3.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible3.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible3.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible3.gateway()) + " attached to Fungible3.");

		// bind Fungible2 to Fungible1
		expect(await fungible1.bindChain(1337, fungibleAddress2)).to.not.be.reverted;
		expect(await fungible2.getMasterChain()).to.equal(1337);
		expect(await fungible2.getMasterAddress()).to.equal(fungibleAddress1);

		// TEST CASE: cannot bind a second token
		// TODO: mock second chain
		//await expect(fungible1.bindChain(1337, fungibleAddress3)).to.be.revertedWithCustomError(fungible1, "OnlySingletonChain");
	});*/

	/********************************************************************************************************/
	/************************************************** Unbind **********************************************/
	/********************************************************************************************************/
	/*it.skip("WHO. Only owner can unbind.", async() => {
		// Tokens
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)

		// TEST CASE: can not unbind if not owner
		await expect(fungible1.connect(addr13).unbindChain(1337)).to.be.revertedWithCustomError(fungible1, "OnlyOwner");
	});*/

	/*it.skip("FROM. Should only unbind from MasterChain token.", async() => {
		// Tokens
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)

		// TEST CASE: cannot unbind if no MasterChain on Fungible1
		expect(await fungible1.getMasterChain()).to.equal(0);
		await expect(fungible1.unbindChain(1337)).to.be.revertedWithCustomError(fungible1, "OnlyMasterChain");
		console.log("OK. Cannot bind if not gateway on Fungible1.");
	});*/

	/*it.skip("TO. Should only unbind Slave empty tokens.", async() => {
		// Tokens
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)

		// set Fungible1 as MasterChain
		expect(await fungible1.getMasterChain()).to.equal(0);
		await expect(fungible1.setAsMasterChain()).to.not.be.reverted;
		expect(await fungible1.getMasterChain()).to.equal(await fungible1.chainId());
		console.log(`Fungible1 ${await fungible1.chainId()} set as MasterChain`);

		// TEST CASE: should not unbind Singleton token
		expect(await fungible2.getMasterChain()).to.equal(0);
		await expect(fungible1.unbindChain(1337)).to.be.revertedWithCustomError(fungible1, "ZeroAddressRequired");
		console.log("OK. Cannot bind if not gateway on Fungible1.");
	});*/

	it.skip("HOW. Gateway is required to unbind.", async() => {

	});

	it.skip("OK. Should be able to unbind if conditions met.", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
	});

	it.skip("OK. Should be able to unbind if conditions met.", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
	});

	/********************************************************************************************************/
	/************************************************ Addresses *********************************************/
	/********************************************************************************************************/
	it.skip("Should be able to read chain addresses", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
	});

	/********************************************************************************************************/
	/******************************************** Transfer MasterChain **************************************/
	/********************************************************************************************************/
	it.skip("Should be able to transfer master chain status", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
	});

});