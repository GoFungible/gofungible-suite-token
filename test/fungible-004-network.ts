import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Fungible__factory } from "../typechain-types";

describe("ERC-20X Supply", function () {
	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;
	let fungibleAddress1: string;
	let fungibleAddress2: string;
	let mockedERC7786GatewayAddress: string;

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
		const MockedERC7786Gateway = await ethers.getContractFactory("MockedERC7786Gateway");
		let mockedERC7786Gateway = await MockedERC7786Gateway.deploy();
		await mockedERC7786Gateway.waitForDeployment();
		mockedERC7786GatewayAddress = await mockedERC7786Gateway.getAddress();
		console.log("MockedERC7786Gateway deployed to:", mockedERC7786GatewayAddress);

		// deploy first chain
		const Fungible1 = await ethers.getContractFactory("Fungible");
		let fungible1 = await Fungible1.deploy("FungiTest", "FGT", 1000_000_000);
		await fungible1.waitForDeployment();
		fungibleAddress1 = await fungible1.getAddress();
		const chainId = await fungible1.chainId();
		console.log(`Fungible ${chainId} deployed at ${fungibleAddress1}`);

		// set first chain as master chain
		expect(await fungible1.getMasterChain()).to.equal(0);
		await expect(fungible1.setAsMasterChain()).to.not.be.reverted;
		expect(await fungible1.getMasterChain()).to.equal(chainId);
		console.log(`Fungible ${chainId} set as MasterChain`);
	});

	afterEach(async() => {
		//await helpers.logICOStatus(ico);
		console.log('--------------------');
	});
	
	after(async() => {
		console.log('--------- Ending Tests --------');
	});

	/********************************************************************************************************/
	/************************************************ Use Cases *********************************************/
	/********************************************************************************************************/
	
	it("Should be able to bind a 2nd chain", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);

		// deploy second chain
		const Fungible2 = await ethers.getContractFactory("Fungible");
		let fungible2 = await Fungible2.deploy("FungiTest", "FGT", 0);
		await fungible2.waitForDeployment();
		fungibleAddress1 = await fungible2.getAddress();
		
	});

	it("Should be able to bind a 3rd chain", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
	});

	it("Should be able to bind a 4th chain", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
	});

	it("Should be able to use chain address", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
	});

	it("Should be able to transfer master chain status", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
	});

	it("Should be able to unbind a chain", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
	});

});