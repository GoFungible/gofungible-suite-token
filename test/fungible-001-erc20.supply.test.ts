// test/network.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import * as helpers from "./_testhelper";

describe.skip("Token ERC-20", function () {
	const hre = require("hardhat");

	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;
	let ico: Contract;

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

		[owner, project, liquidity, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
		[owner, project, liquidity, addr1, addr2, addr3, ...addrs].forEach(async(account, i) => {
			let balance = await ethers.provider.getBalance(account.address);
			console.log('%d - address: %s ; balance: %s', ++i, account.address, balance);
		});

		

	});

	afterEach(async() => {
		//await helpers.logICOStatus(ico);
		console.log('--------------------');
	});
	
	after(async() => {
		console.log('--------- Ending Tests --------');
	});



	it("Initial Logs.", async() => {



	});

	/********************************************************************************************************/
	/*************************************************** supply *********************************************/
	/********************************************************************************************************/
	it("Should have correct initial supply", async function () {
		//const totalSupply = await fungible.totalSupply();
		//expect(totalSupply).to.equal(ethers.parseEther("1000000"));
	});

	it("Should transfer tokens", async function () {
		//const amount = ethers.parseEther("100");
		//const user1Addr = await user1.getAddress();
		
		//await fungible.connect(owner).transfer(user1Addr, amount);
		
		//const balance = await fungible.balanceOf(user1Addr);
		//expect(balance).to.equal(amount);
	});

	/********************************************************************************************************/
	/**************************************************** supply ********************************************/
	/********************************************************************************************************/
	it("Should update a checkpoint.", async() => {
		
	});

	it("Should override oldest checkpoint.", async() => {
		
	});

	it("Should be able to reload a checkpoint.", async() => {

	});

	/********************************************************************************************************/
	/*************************************************** transfer *******************************************/
	/********************************************************************************************************/



	/********************************************************************************************************/
	/************************************************** allowances ******************************************/
	/********************************************************************************************************/



	/********************************************************************************************************/
	/***************************************** Supply Version Protection ************************************/
	/********************************************************************************************************/



	/********************************************************************************************************/
	/**************************************** Supply Migration Protection ***********************************/
	/********************************************************************************************************/


});