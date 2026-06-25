// test/network.test.ts
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { Fungible__factory } from "../typechain-types";

describe("ERC-20 Supply", function () {
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
	/********************************************* Total Supply *********************************************/
	/********************************************************************************************************/
	it("Should have correct initial supply", async function () {
		const fungibleContract = Fungible__factory.connect(fungibleAddress, owner);
		expect(await fungibleContract.totalSupply()).to.equal(ethers.parseEther("1000000000"));
		expect(await fungibleContract.connect(addr1).totalSupply()).to.equal(ethers.parseEther("1000000000"));
	});

	/********************************************************************************************************/
	/************************************************ Balance ***********************************************/
	/********************************************************************************************************/
	it("Should have correct balance", async function () {
		const fungibleContract = Fungible__factory.connect(fungibleAddress, owner);

		expect(await fungibleContract.balanceOf(owner)).to.equal(ethers.parseEther("1000000000"));
		expect(await fungibleContract.connect(addr1).balanceOf(owner)).to.equal(ethers.parseEther("1000000000"));

		expect(await fungibleContract.balanceOf(addr1)).to.equal(ethers.parseEther("0"));
		expect(await fungibleContract.connect(addr1).balanceOf(addr1)).to.equal(ethers.parseEther("0"));
	});

	/********************************************************************************************************/
	/************************************************ Transfer **********************************************/
	/********************************************************************************************************/
	it("Should transfer tokens", async function () {
		const fungibleContract = Fungible__factory.connect(fungibleAddress, owner);
		
		expect(await fungibleContract.balanceOf(owner)).to.equal(ethers.parseEther("1000000000"));

		await expect(fungibleContract.transfer(addr1.address, ethers.parseUnits("20", 18))).to.not.be.reverted;
		expect(await fungibleContract.balanceOf(owner)).to.equal(ethers.parseEther("999999980"));
		expect(await fungibleContract.balanceOf(addr1)).to.equal(ethers.parseEther("20"));

		await expect(fungibleContract.connect(addr1).transfer(addr2.address, ethers.parseUnits("10", 18))).to.not.be.reverted;
		expect(await fungibleContract.balanceOf(owner)).to.equal(ethers.parseEther("999999980"));
		expect(await fungibleContract.balanceOf(addr1)).to.equal(ethers.parseEther("10"));
		expect(await fungibleContract.balanceOf(addr2)).to.equal(ethers.parseEther("10"));
	});

	/********************************************************************************************************/
	/********************************************** Allowance ***********************************************/
	/********************************************************************************************************/
	it("Should be able to approve", async function () {
		const fungibleContract = Fungible__factory.connect(fungibleAddress, owner);
		
		expect(await fungibleContract.balanceOf(owner)).to.equal(ethers.parseEther("1000000000"));

		await expect(fungibleContract.connect(addr1).transferFrom(owner.address, addr1.address, ethers.parseUnits("10", 18))).to.be.revertedWith('ERC20: insufficient allowance');
		expect(await fungibleContract.connect(owner).approve(addr1.address, ethers.parseUnits("20", 18))).to.not.be.reverted;
		expect(await fungibleContract.connect(owner).allowance(owner.address, addr1.address)).to.equal(ethers.parseUnits("20", 18));
		expect(await fungibleContract.connect(addr1).allowance(owner.address, addr1.address)).to.equal(ethers.parseUnits("20", 18));
		await expect(fungibleContract.connect(addr1).transferFrom(owner.address, addr1.address, ethers.parseUnits("10", 18))).to.not.be.reverted;
		expect(await fungibleContract.connect(addr1).balanceOf(owner)).to.equal(ethers.parseEther("999999990"));
		expect(await fungibleContract.connect(addr1).balanceOf(addr1)).to.equal(ethers.parseEther("10"));
	});

});