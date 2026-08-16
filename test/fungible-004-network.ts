import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Fungible__factory } from "../typechain-types";

describe("ERC-20X Supply", function () {
	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;
	let fungibleAddress1: string;
	let fungibleAddress2: string;
	let fungibleAddress3: string;
	let fungibleAddress4: string;
	let fungibleAddress9: string;
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
		console.log('*******************************');
		console.log('******** Starting Test ********');
		console.log('*******************************');

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
		// deploy MockedERC7786Gateway
		const MockedERC7786Gateway = await ethers.getContractFactory("MockedERC7786Gateway");
		let mockedERC7786Gateway = await MockedERC7786Gateway.deploy();
		expect(await mockedERC7786Gateway.waitForDeployment()).to.not.be.reverted;
		mockedERC7786GatewayAddress = await mockedERC7786Gateway.getAddress();
		console.log("MockedERC7786Gateway deployed to:", mockedERC7786GatewayAddress);

		// deploy Fungible1
		const Fungible1 = await ethers.getContractFactory("Fungible");
		let fungible1 = await Fungible1.deploy("FungiTest", "FGT", 1000_000_000);
		expect(await fungible1.waitForDeployment()).to.not.be.reverted;
		fungibleAddress1 = await fungible1.getAddress();
		console.log(`Fungible1 ${await fungible1.chainId()} deployed at ${fungibleAddress1}`);

		// deploy Fungible2
		const Fungible2 = await ethers.getContractFactory("Fungible");
		let fungible2 = await Fungible2.deploy("FungiTest", "FGT", 0);
		expect(await fungible2.waitForDeployment()).to.not.be.reverted;
		fungibleAddress2 = await fungible2.getAddress();
		console.log(`Fungible2 ${await fungible2.chainId()} deployed at ${fungibleAddress2}`);

		// deploy Fungible3
		const Fungible3 = await ethers.getContractFactory("Fungible");
		let fungible3 = await Fungible3.deploy("FungiTest", "FGT", 0);
		expect(await fungible3.waitForDeployment()).to.not.be.reverted;
		fungibleAddress3 = await fungible3.getAddress();
		console.log(`Fungible3 ${await fungible3.chainId()} deployed at ${fungibleAddress3}`);

		// deploy Fungible4
		const Fungible4 = await ethers.getContractFactory("Fungible");
		let fungible4 = await Fungible4.deploy("FungiTest", "FGT", 0);
		expect(await fungible4.waitForDeployment()).to.not.be.reverted;
		fungibleAddress4 = await fungible4.getAddress();
		console.log(`Fungible4 ${await fungible4.chainId()} deployed at ${fungibleAddress4}`);

		// deploy Fungible9
		const Fungible9 = await ethers.getContractFactory("Fungible");
		let fungible9 = await Fungible9.deploy("FungiTest", "FGT", 1000_000_000);
		expect(await fungible9.waitForDeployment()).to.not.be.reverted;
		fungibleAddress9 = await fungible9.getAddress();
		console.log(`Fungible9 ${await fungible9.chainId()} deployed at ${fungibleAddress9}`);		
	});

	afterEach(async() => {
		//await helpers.logICOStatus(ico);
		console.log('--------------------');
	});
	
	after(async() => {
		console.log('--------- Ending Tests --------');
	});

	/********************************************************************************************************/
	/************************************************ Test Cases ********************************************/
	/********************************************************************************************************/
	it("WHO. Only owner can bind.", async() => {
		// Tokens
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)

		// TEST CASE: can not bind if not owner
		await expect(fungible1.connect(addr3).bindChain(1337, fungibleAddress2)).to.be.revertedWithCustomError(fungible1, "OnlyOwner");
	});

	it("FROM. Should only bind from MasterChain token.", async() => {
		// Tokens
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)

		// set gateway to Fungible1
		await expect(fungible1.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible1.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible1.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible1.gateway()) + " attached to Fungible1.");

		// TEST CASE: cannot bind if no MasterChain on Fungible1
		expect(await fungible1.getMasterChain()).to.equal(0);
		await expect(fungible1.bindChain(1337, fungibleAddress2)).to.be.revertedWithCustomError(fungible1, "OnlyMasterChain");
		console.log("OK. Cannot bind if not gateway on Fungible1.");
	});

	it("HOW. Gateway is required to bind.", async() => {
		// Tokens
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)

		// set Fungible1 as MasterChain
		expect(await fungible1.getMasterChain()).to.equal(0);
		await expect(fungible1.setAsMasterChain()).to.not.be.reverted;
		expect(await fungible1.getMasterChain()).to.equal(await fungible1.chainId());
		console.log(`Fungible1 ${await fungible1.chainId()} set as MasterChain`);

		// TEST CASE: cannot bind if no gateway on Fungible1
		expect(await fungible1.gateway()).to.equal(ethers.ZeroAddress);
		await expect(fungible1.bindChain(1337, fungibleAddress2)).to.be.revertedWithCustomError(fungible1, "GatewayRequired");
		console.log("OK. Cannot bind if not gateway on Fungible1.");

		// set gateway to Fungible1
		await expect(fungible1.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible1.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible1.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible1.gateway()) + " attached to Fungible1.");

		// TEST CASE: cannot bind if no gateway on Fungible2
		expect(await fungible2.gateway()).to.equal(ethers.ZeroAddress);
		await expect(fungible1.bindChain(1337, fungibleAddress2)).to.be.revertedWithCustomError(fungible1, "GatewayRequired");
		console.log("OK. Cannot bind if not gateway on Fungible1.");
	});

	it("TO. Should only bind to Singleton empty token.", async() => {
		// set Fungible1 as MasterChain
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		expect(await fungible1.getMasterChain()).to.equal(0);
		await expect(fungible1.setAsMasterChain()).to.not.be.reverted;
		expect(await fungible1.getMasterChain()).to.equal(await fungible1.chainId());
		console.log(`Fungible1 ${await fungible1.chainId()} set as MasterChain`);

		// set Fungible2 as MasterChain
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)
		expect(await fungible2.getMasterChain()).to.equal(0);
		await expect(fungible2.setAsMasterChain()).to.not.be.reverted;
		expect(await fungible2.getMasterChain()).to.equal(await fungible2.chainId());
		console.log(`Fungible2 ${await fungible2.chainId()} set as MasterChain`);

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

		// set gateway to Fungible9
		const fungible9 = await ethers.getContractAt('Fungible', fungibleAddress9)
		await expect(fungible9.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible9.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible9.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible9.gateway()) + " attached to Fungible2.");

		// TEST CASE: cannot bind a MasterChain
		await expect(fungible1.bindChain(1337, fungibleAddress2)).to.be.revertedWithCustomError(fungible1, "OnlySingletonChain");

		// TEST CASE: cannot bind a token with supply
		await expect(fungible1.bindChain(1337, fungibleAddress9)).to.be.revertedWithCustomError(fungible1, "ZeroRequired");
	});

	it("OK. Should be able to bind if conditions met.", async() => {
		// set Fungible1 as MasterChain
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
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
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)
		await expect(fungible2.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible2.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible2.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible2.gateway()) + " attached to Fungible2.");

		// bind Fungible2 to Fungible1
		expect(await fungible1.bindChain(1337, fungibleAddress2)).to.not.be.reverted;
		expect(await fungible2.getMasterChain()).to.equal(1337);
		expect(await fungible2.getMasterAddress()).to.equal(fungibleAddress1);
	});

	it("TO. Should not bind a second token in the same chain.", async() => {
		// set Fungible1 as MasterChain
		const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
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
		const fungible2 = await ethers.getContractAt('Fungible', fungibleAddress2)
		await expect(fungible2.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible2.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible2.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible2.gateway()) + " attached to Fungible2.");

		// set gateway to Fungible3
		const fungible3 = await ethers.getContractAt('Fungible', fungibleAddress3)
		await expect(fungible3.addResource(0, 1, mockedERC7786GatewayAddress, 132, 0, 0)).to.not.be.reverted;
		await expect(fungible3.releaseResource(0, 0)).to.not.be.reverted;
		expect(await fungible3.gateway()).to.equal(mockedERC7786GatewayAddress);
		console.log("Gateway " + (await fungible3.gateway()) + " attached to Fungible3.");

		// bind Fungible2 to Fungible1
		expect(await fungible1.bindChain(1337, fungibleAddress2)).to.not.be.reverted;
		expect(await fungible2.getMasterChain()).to.equal(1337);
		expect(await fungible2.getMasterAddress()).to.equal(fungibleAddress1);

		// TEST CASE: cannot bind a second token
		//await expect(fungible1.bindChain(1337, fungibleAddress3)).to.be.revertedWithCustomError(fungible1, "OnlySingletonChain");
	});

	it("Should be able to unbind a chain", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
	});

	it("Should be able to read chain addresses", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
	});

	it("Should be able to transfer master chain status", async() => {
		//const fungible1 = await ethers.getContractAt('Fungible', fungibleAddress1)
		//fungible1.setMasterChain(1337);
	});

});