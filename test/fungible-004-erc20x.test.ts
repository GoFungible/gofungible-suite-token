import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Fungible__factory } from "../typechain-types";

describe("ERC-20X Supply", function () {
	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;
	let fungibleAddress1: string;
	let fungibleAddress2: string;
	let mockedERC20nExtensionAddress: string;

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
		const MockedERC20nExtension = await ethers.getContractFactory("MockedERC20nExtension");
		let mockedERC20nExtension = await MockedERC20nExtension.deploy();
		await mockedERC20nExtension.waitForDeployment();
		mockedERC20nExtensionAddress = await mockedERC20nExtension.getAddress();
		console.log("MockedERC20nExtension deployed to:", mockedERC20nExtensionAddress);

		// deploy Fungible1
		const Fungible1 = await ethers.getContractFactory("Fungible");
		let fungible1 = await Fungible1.deploy("FungiTest", "FGT", 1000_000_000);
		await fungible1.waitForDeployment();
		fungibleAddress1 = await fungible1.getAddress();
		console.log("Fungible1 deployed to:", fungibleAddress1);

		// deploy Fungible2
		const Fungible2 = await ethers.getContractFactory("Fungible");
		let fungible2 = await Fungible2.deploy("FungiTest", "FGT", 0);
		await fungible2.waitForDeployment();
		fungibleAddress2 = await fungible2.getAddress();
		console.log("Fungible2 deployed to:", fungibleAddress2);

		// attach relayer
		await expect(fungible1.addResource(0, 1, mockedERC20nExtension, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible1.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible1.gateway()).to.equal(mockedERC20nExtensionAddress);
		console.log("Gateway " + (await fungible1.gateway()) + " attached to Fungible1.");

		await expect(fungible2.addResource(0, 1, mockedERC20nExtension, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible2.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible2.gateway()).to.equal(mockedERC20nExtensionAddress);
		console.log("Gateway " + (await fungible2.gateway()) + " attached to Fungible2.");

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
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
	});

	/********************************************************************************************************/
	/******************************************** Master Chain **********************************************/
	/********************************************************************************************************/
	it("Should be able to configure master chain", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
	});

	/********************************************************************************************************/
	/************************************************ Supplies **********************************************/
	/********************************************************************************************************/
	it("Should be able to get cross supplies", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1);
		//fungible1.getAllRemoteSupplies();
	});

	/********************************************************************************************************/
	/************************************************ TransferX *********************************************/
	/********************************************************************************************************/

	// On ChainA: ChainA:AccountA to ChainA:AccountB (transfer)
	// On ChainA: ChainA:AccountA to ChainB:AccountB (transferX) <-------------
	// On ChainB: ChainA:AccountA to ChainB:AccountB (proxy)
	// On ChainC: ChainA:AccountA to ChainB:AccountB (proxy)
	it("ChainA should be able to transfer from ChainA:owner to ChainB:owner", async() => {
		const fungible1 = Fungible__factory.connect(fungibleAddress1, owner);
		expect(await fungible1.globalSupply()).to.equal(ethers.parseEther("1000000000"));
		const fungible2 = Fungible__factory.connect(fungibleAddress2, owner);
		expect(await fungible2.globalSupply()).to.equal(ethers.parseEther("0"));

		//await expect(fungible1.transferX(0, owner, 1000)).to.not.be.reverted;

	});
	
	it("ChainA should be able to transfer from ChainA:AccountA to ChainB:AccountB", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1);
		//fungible1.transferX(1337, fungibleAddress2, 100_000);
	});

});