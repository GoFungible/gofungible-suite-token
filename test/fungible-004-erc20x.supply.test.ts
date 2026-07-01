import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ERC-20X Supply", function () {
	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;
	let fungibleAddress1: string;
	let fungibleAddress2: string;
	let mockSupplyRelayerAddress: string;

	/********************************************************************************************************/
	/************************************************** hooks ***********************************************/
	/********************************************************************************************************/
	before(async() => {
		console.log('*******************************');
		console.log('******** Starting Tests *******');
		console.log('*******************************');
	});

	beforeEach(async() => {
		//console.log('--------------------');
		await hre.network.provider.send("hardhat_reset");

		// ***********************************************************************************************************************************************************
		// ************************************************************************** Log Signers ********************************************************************
		// ***********************************************************************************************************************************************************
		// get accounts
		[owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
		[owner, addr1, addr2, addr3, ...addrs].forEach(async(account, i) => {
			let balance = await ethers.provider.getBalance(account.address);
			console.log('%d - address: %s ; balance: %s', ++i, account.address, balance);
		});

		// ***********************************************************************************************************************************************************
		// ********************************************************* Install Versionable Facets and register in factory **********************************************
		// ***********************************************************************************************************************************************************
		// deploy mocked relayer
		const MockSupplyRelayer = await ethers.getContractFactory("MockedSupplyRelayer");
		let mockSupplyRelayer = await MockSupplyRelayer.deploy();
		await mockSupplyRelayer.waitForDeployment();
		mockSupplyRelayerAddress = await mockSupplyRelayer.getAddress();
		console.log(" MockSupplyRelayer deployed to:", mockSupplyRelayerAddress);

		// deploy Fungible1
		const Fungible1 = await ethers.getContractFactory("Fungible");
		let fungible1 = await Fungible1.deploy("FungiTest", "FGT", 1000_000_000);
		await fungible1.waitForDeployment();
		fungibleAddress1 = await fungible1.getAddress();
		console.log(" Fungible1 deployed to:", fungibleAddress1);

		// deploy Fungible2
		const Fungible2 = await ethers.getContractFactory("Fungible");
		let fungible2 = await Fungible2.deploy("FungiTest", "FGT", 0);
		await fungible2.waitForDeployment();
		fungibleAddress2 = await fungible2.getAddress();
		console.log(" Fungible2 deployed to:", fungibleAddress2);

		// attach relayer
		fungible1.addResource(0, 1, mockSupplyRelayerAddress, 132, 0, 0);
		fungible2.addResource(0, 1, mockSupplyRelayerAddress, 132, 0, 0);
		fungible1.releaseResource(0, 0);
		fungible2.releaseResource(0, 0);

	});

	afterEach(async() => {
		//await helpers.logICOStatus(ico);
		console.log('--------------------');
	});
	
	after(async() => {
		console.log('--------- Ending Tests --------');
	});

	/********************************************************************************************************/
	/******************************************** Global Supply *********************************************/
	/********************************************************************************************************/
	it("ChainA should be able to transfer from ChainA:AccountA to ChainA:AccountB", async() => {
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
	});

	/********************************************************************************************************/
	/******************************************** Master Chain **********************************************/
	/********************************************************************************************************/
	it("Should be able to configure master chain", async() => {
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		fungible1.setMasterChain(1337);
	});

	/********************************************************************************************************/
	/************************************************ Supplies **********************************************/
	/********************************************************************************************************/
	it("Should be able to get cross supplies", async() => {
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1);
		fungible1.getAllRemoteSupplies();
	});

	/********************************************************************************************************/
	/************************************************ TransferX *********************************************/
	/********************************************************************************************************/

	// On ChainA: ChainA:AccountA to ChainA:AccountB (transfer)
	// On ChainA: ChainA:AccountA to ChainB:AccountB (transferX) <-------------
	// On ChainB: ChainA:AccountA to ChainB:AccountB (proxy)
	// On ChainC: ChainA:AccountA to ChainB:AccountB (proxy)
	it("ChainA should be able to transfer from ChainA:owner to ChainB:owner", async() => {
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1);
		fungible1.transferX(1337, fungibleAddress2, 100_000);
	});
	
	it("ChainA should be able to transfer from ChainA:AccountA to ChainB:AccountB", async() => {
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1);
		fungible1.transferX(1337, fungibleAddress2, 100_000);
	});

});