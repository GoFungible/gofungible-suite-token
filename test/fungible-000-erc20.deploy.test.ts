// test/network.test.ts
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import * as helpers from "./_testhelper";
import { Fungible__factory } from "../typechain-types";

describe("ERC-20 Tokens", function () {
	let owner: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;
	let fungibleAddress: string;

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

	/********************************************************************************************************/
	/********************************************* supporting functions *************************************/
	/********************************************************************************************************/
	it("Initial Logs.", async() => {

		console.log("\n");
		console.log("Addresses:");
		console.log("\tOwner address: " + owner.address);
		const fungibleContract = Fungible__factory.connect(fungibleAddress, owner);
		console.log("\tFungible Sync Address: " + fungibleContract.target);
		console.log("\tFungible Async Address: " + await fungibleContract.getAddress());
		console.log("\n");

	});

	it("Should do number conversions.", async() => {

		console.log("usd to wei to usd: " + helpers.weiToUsd(helpers.usdToWei(10)));
		console.log("usd to eher to usd: " + helpers.etherToUsd(helpers.usdToEther(10)));

	});

	/********************************************************************************************************/
	/********************************************** Only Owner **********************************************/
	/********************************************************************************************************/
	it("Only Owner functions are ok for owner", async() => {
		const fungibleContract = Fungible__factory.connect(fungibleAddress, owner);
		await expect(() => fungibleContract.name()).to.not.throw();
		await expect(() => fungibleContract.symbol()).to.not.throw();
		await expect(() => fungibleContract.decimals()).to.not.throw();

		await expect(fungibleContract.totalSupply()).to.not.be.reverted;
		await expect(fungibleContract.balanceOf(owner)).to.not.be.reverted;

		await expect(fungibleContract.checkpointNonce()).to.not.be.reverted;
		await expect(fungibleContract.totalSupplyAt(5)).to.not.be.reverted;
		await expect(fungibleContract.balanceOfAt(owner, 5)).to.not.be.reverted;

		//await expect(fungibleContract.transfer(addr1, 10 * 10**18)).to.not.be.reverted;
		//await expect(fungibleContract.allowance(addr1, owner)).to.not.be.reverted;
		//await expect(fungibleContract.approve(addr1, 10 * 10**18)).to.not.be.reverted;

		await expect(fungibleContract.setRelayer(fungibleAddress)).to.not.be.reverted;

		await expect(fungibleContract.globalSupply()).to.not.be.reverted;
		await expect(fungibleContract.getAllRemoteSupplies()).to.not.be.reverted;
		await expect(fungibleContract.balanceOfX(owner)).to.not.be.reverted;

		//await expect(fungibleContract.transferX(25, addr1, 10 * 10**18)).to.not.be.reverted;

	});

	/*it("Only Owner functions are not ok for not owner", async() => {
		const fungibleContract = Fungible__factory.connect(fungibleAddress, addr1);
		await expect(fungibleContract.name()).not.to.be.reverted;
		await expect(fungibleContract.symbol()).to.not.be.reverted;
		await expect(fungibleContract.decimals()).to.not.be.reverted;

		await expect(fungibleContract.totalSupply()).to.not.be.reverted;
		await expect(fungibleContract.balanceOf(owner)).to.not.be.reverted;

		await expect(fungibleContract.setRelayer(fungibleAddress)).to.be.revertedWith('Ownable: caller is not the owner');
	});*/

	/********************************************************************************************************/
	/*************************************************** metadata *******************************************/
	/********************************************************************************************************/
	it("Should return symbol.", async() => {
		
	});
	it("Should return name.", async() => {
		
	});
	it("Should return decimals.", async() => {
		
	});



});