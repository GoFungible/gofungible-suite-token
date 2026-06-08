// test/network.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import hre from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import * as helpers from "./_testhelper";

describe("ERC-20 Tokens", function () {
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;

	beforeEach(async() => {
		//console.log('--------------------');
		await hre.network.provider.send("hardhat_reset");

		// ***********************************************************************************************************************************************************
		// ************************************************************************** Log Signers ********************************************************************
		// ***********************************************************************************************************************************************************
		// get accounts
		[owner, project, liquidity, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
		[owner, project, liquidity, addr1, addr2, addr3, ...addrs].forEach(async(account, i) => {
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
		console.log("Fungible deployed:" + await fungible.getAddress());

	});

	/********************************************************************************************************/
	/*************************************************** metadata *******************************************/
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

});