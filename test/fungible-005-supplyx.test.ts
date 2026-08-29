import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { Fungible, Fungible__factory, MockedERC7786Gateway } from "../typechain-types";
import { JsonRpcSigner, ZeroAddress } from "ethers";
import { NO_SELECTOR, selector, UNIVERSAL_ERRORS_ABI, waitForContractEvent } from "./_testhelper";
import { ERC7786MockGatewayRelayer } from "./relayer/ERC7786MockGatewayRelayer";

describe("ERC-20X Supply", function () {
	let owner1: JsonRpcSigner, relayer1: JsonRpcSigner, addr11: JsonRpcSigner, addr12: JsonRpcSigner, addr13: JsonRpcSigner, addrs1: JsonRpcSigner[];
	let owner2: JsonRpcSigner, relayer2: JsonRpcSigner, addr21: JsonRpcSigner, addr22: JsonRpcSigner, addr23: JsonRpcSigner, addrs2: JsonRpcSigner[];
	let fungibleMaster1: Fungible, mockedERC7786Gateway1: MockedERC7786Gateway;
	let fungibleSingleton2: Fungible, mockedERC7786Gateway2: MockedERC7786Gateway;

	/********************************************************************************************************/
	/************************************************** hooks ***********************************************/
	/********************************************************************************************************/
	before(async() => {
		console.log('*******************************');
		console.log(`\nTest Suite: ${this.title}`);
		console.log('*******************************');
		console.log(`Preparing transferX test cases.`);

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

		// deploy FungibleSingleton2
		const FungibleSingleton2 = await ethers.getContractFactory("Fungible", owner2);
		fungibleSingleton2 = await FungibleSingleton2.deploy("FungibleSingleton2Test", "FGT", 0);
		expect(await fungibleSingleton2.waitForDeployment()).to.not.be.reverted;
		const fungibleSingletonAddress2 = await fungibleSingleton2.getAddress();
		expect(await fungibleSingleton2.chainId()).to.equal(2222);
		expect(await fungibleSingleton2.getMasterChain()).to.equal(0);
		expect(await fungibleSingleton2.getMasterAddress()).to.equal(ZeroAddress);
		console.log(`FungibleSingleton2 deployed on ${await fungibleSingleton2.chainId()} at ${fungibleSingletonAddress2}`);

		// ***********************************************************************************************************************************************************
		// *********************************************************************** Add Gateways **********************************************************************
		// ***********************************************************************************************************************************************************

		expect(await fungibleMaster1.addResource(0, 1, mockedERC7786GatewayAddress1, 1, 0, 0)).to.not.be.reverted;
		expect(await fungibleMaster1.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungibleMaster1.gateway()).to.equal(mockedERC7786GatewayAddress1);

		expect(await fungibleSingleton2.addResource(0, 1, mockedERC7786GatewayAddress2, 1, 0, 0)).to.not.be.reverted;
		expect(await fungibleSingleton2.releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		expect(await fungibleSingleton2.gateway()).to.equal(mockedERC7786GatewayAddress2);

		// ***********************************************************************************************************************************************************
		// ********************************************************** Mock fungibleMaster1 -> fungibleSingleton2 *****************************************************
		// ***********************************************************************************************************************************************************
		// bind fungibleMaster1 and fungibleSingleton2
		expect(await fungibleMaster1.bind(2222, fungibleSingleton2)).to.not.be.reverted;
		expect(await waitForContractEvent({ contract: fungibleMaster1, eventName: "FungibleMessageCallbackProcessed" }).then(([sendId, selectorIfError]) => selectorIfError)).to.equal(NO_SELECTOR);
		expect(await fungibleMaster1.getChains()).to.include(2222n);
		expect(await fungibleMaster1.getChainAddress(2222)).to.equals(fungibleSingleton2);
		expect(await fungibleSingleton2.getMasterChain()).to.equal(1111);
		expect(await fungibleSingleton2.getMasterAddress()).to.equal(fungibleMaster1);
	});

	beforeEach(async function (this: Mocha.Context) {
		console.log(`\nTest: ${this.currentTest?.title}`);
		console.log('***************************************************************************');
	});

	afterEach(async() => {
		console.log('--------------------');
	});
	
	after(async() => {
		console.log('--------- Ending Tests --------');
	});

	/********************************************************************************************************/
	/************************************************ Supplies **********************************************/
	/********************************************************************************************************/
	it("Should be able to get cross supplies", async() => {

	});

	/********************************************************************************************************/
	/************************************************* Bridge ***********************************************/
	/********************************************************************************************************/
	it("FROM. Only can bridge throught MasterChain", async() => {
		await expect(fungibleSingleton2.bridge(3333, fungibleMaster1, 500_000_000)).to.be.revertedWithCustomError(fungibleSingleton2, "OnlyTransferXThroughtMasterChain");
	});

	it("FROM. Only accounts with enought funds can bridge", async() => {
		await expect(fungibleMaster1.connect(addr11).bridge(2222, fungibleSingleton2, 500_000_000)).to.be.revertedWithCustomError(fungibleMaster1, "OnlyTransferXWithFunds");
	});

	it("TO. Only can bridge to bound token", async() => {
		await expect(fungibleMaster1.bridge(3333, fungibleSingleton2, 500_000_000)).to.be.revertedWithCustomError(fungibleMaster1, "OnlyTransferXBoundTokens");
	});

	it("OK. Should be able to bridge if all conditiosn match", async() => {
		expect(await fungibleMaster1.totalSupply()).to.equal(ethers.parseEther("1000000000"));
		expect(await fungibleMaster1.balanceOf(owner1)).to.equal(ethers.parseEther("1000000000"));
		expect(await fungibleSingleton2.totalSupply()).to.equal(0);
		expect(await fungibleSingleton2.balanceOf(owner2)).to.equal(0);

		expect(await fungibleMaster1.bridge(2222, fungibleSingleton2, 500_000_000)).to.not.be.reverted;
		expect(await waitForContractEvent({ contract: fungibleMaster1, eventName: "FungibleMessageCallbackProcessed" }).then(([sendId, selectorIfError]) => selectorIfError)).to.equal(NO_SELECTOR);
		
		expect(await fungibleMaster1.totalSupply()).to.equal(ethers.parseEther("500000000"));
		expect(await fungibleMaster1.balanceOf(owner1)).to.equal(ethers.parseEther("500000000"));
		expect(await fungibleSingleton2.totalSupply()).to.equal(ethers.parseEther("500000000"));
		//expect(await fungibleSingleton2.balanceOf(owner2)).to.equal(ethers.parseEther("500000000"));

		/*expect(await fungibleMaster1.bridge(2222, fungibleSingleton2Address1, 500_000_000)).to.not.be.reverted;

		expect(await fungibleMaster1.totalSupply()).to.equal(ethers.parseEther("500000000"));
		expect(await fungibleMaster1.balanceOf(owner1)).to.equal(ethers.parseEther("500000000"));
		expect(await fungibleSingleton2.totalSupply()).to.equal(ethers.parseEther("500000000"));
		expect(await fungibleSingleton2.balanceOf(owner2)).to.equal(ethers.parseEther("500000000"));*/
	});

	/********************************************************************************************************/
	/************************************************** Pay *************************************************/
	/********************************************************************************************************/
	it("Any holder should be able to pay within same network", async() => {

	});

	it("Any holder should be able to pay cross-network", async() => {

	});

});