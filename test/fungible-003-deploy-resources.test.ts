import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Deploy Resources", function () {
	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;
	let fungibleAddress: string;

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
		// deploy Fungible
		const Fungible = await ethers.getContractFactory("Fungible");
		let fungible = await Fungible.deploy("FungiTest", "FGT", 1000_000_000);
		await fungible.waitForDeployment();
		fungibleAddress = await fungible.getAddress();
		console.log(" Fungible deployed to:", fungibleAddress);

	});

	afterEach(async() => {
		//await helpers.logICOStatus(ico);
		console.log('--------------------');
	});
	
	after(async() => {
		console.log('--------- Ending Tests --------');
	});

	/********************************************************************************************************/
	/*********************************************** Resources **********************************************/
	/********************************************************************************************************/
	it("Should be able to add resources", async() => {

	});

	it("Should be able to list resources", async() => {

	});

	/********************************************************************************************************/
	/*************************************** Release Resources **********************************************/
	/********************************************************************************************************/
	it("Should be able to release resources by Timelock Protection", async() => {

	});

	it("Should be able to release resources by Votation Protection", async() => {

	});

	it("Should be able to release resources by Timelock and Votation Protection", async() => {

	});

	/********************************************************************************************************/
	/***************************************** Run Resources ************************************************/
	/********************************************************************************************************/
	it("Should be able to run Relayer", async() => {

	});

	it("Should be able to run extTransportINBlock", async() => {

	});

	it("Should be able to run extTransportINUpdate", async() => {

	});

	it("Should be able to run extTransportINLog", async() => {

	});

	it("Should be able to run extTransportOUT", async() => {

	});


});