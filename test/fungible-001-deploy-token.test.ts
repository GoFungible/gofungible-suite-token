import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import * as helpers from "./_testhelper";
import { Fungible__factory } from "../typechain-types";

describe("Deploy Token", function () {
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

		await expect(fungibleContract.transfer(addr1.address, ethers.parseUnits("10", 18))).to.not.be.reverted;
		await expect(fungibleContract.approve(addr1.address, ethers.parseUnits("10", 18))).to.not.be.reverted;
		await expect(fungibleContract.allowance(owner.address, addr1.address)).to.not.be.reverted;
		await expect(fungibleContract.connect(addr1).transferFrom(owner.address, addr1.address, ethers.parseUnits("10", 18))).to.not.be.reverted;

		await expect(fungibleContract.globalSupply()).to.not.be.reverted;
		await expect(fungibleContract.getAllRemoteSupplies()).to.not.be.reverted;
		await expect(fungibleContract.balanceOfX(owner)).to.not.be.reverted;

		//await expect(fungibleContract.transferX(25, addr1.address, ethers.parseUnits("10", 18))).to.not.be.reverted;

		await expect(fungibleContract.addResource(45, 1, fungibleAddress, 0, 10, 10)).to.not.be.reverted;
		await expect(fungibleContract.getPendingResourcesIds()).to.not.be.reverted;
		//await expect(fungibleContract.releaseResource(45, 0)).to.not.be.reverted;

		await expect(fungibleContract.setReceiveFacet(addr1.address)).to.not.be.reverted;

	});

	it("Only Owner functions are not ok for not owner", async() => {
		const fungibleContract = Fungible__factory.connect(fungibleAddress, addr1);
		await expect(() => fungibleContract.connect(addr1).name()).to.not.throw();
		await expect(() => fungibleContract.connect(addr1).symbol()).to.not.throw();
		await expect(() => fungibleContract.connect(addr1).decimals()).to.not.throw();

		await expect(fungibleContract.connect(addr1).totalSupply()).to.not.be.reverted;
		await expect(fungibleContract.connect(addr1).balanceOf(owner)).to.not.be.reverted;

		await expect(fungibleContract.connect(owner).transfer(addr1.address, ethers.parseUnits("20", 18))).to.not.be.reverted;
		await expect(fungibleContract.connect(addr1).approve(addr2.address, ethers.parseUnits("10", 18))).to.not.be.reverted;
		//await expect(fungibleContract.connect(addr1).transferFrom(addr1.address, addr2.address, ethers.parseUnits("10", 18))).to.not.be.reverted;

		await expect(fungibleContract.connect(addr1).globalSupply()).to.not.be.reverted;
		await expect(fungibleContract.connect(addr1).getAllRemoteSupplies()).to.not.be.reverted;
		await expect(fungibleContract.connect(addr1).balanceOfX(addr1)).to.not.be.reverted;

		await expect(fungibleContract.transferX(25, addr1.address, ethers.parseUnits("10", 18))).to.be.revertedWith('Ownable: caller is not the owner');

		await expect(fungibleContract.connect(addr1).addResource(45, 1, fungibleAddress, 0, 10, 10)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(fungibleContract.connect(addr1).getPendingResourcesIds()).to.not.be.reverted;
		await expect(fungibleContract.releaseResource(45, 0)).to.be.revertedWith('Ownable: caller is not the owner');

		await expect(fungibleContract.connect(addr1).setReceiveFacet(addr1.address)).to.be.revertedWith('Ownable: caller is not the owner');

	});

	/********************************************************************************************************/
	/*************************************************** metadata *******************************************/
	/********************************************************************************************************/
	it("Should return symbol.", async() => {
		const fungibleContract = Fungible__factory.connect(fungibleAddress, owner);
		expect(await fungibleContract.symbol()).to.equal("FGT");
	});

	it("Should return name.", async() => {
		const fungibleContract = Fungible__factory.connect(fungibleAddress, owner);
		expect(await fungibleContract.name()).to.equal("FungiTest");
	});
	
	it("Should return decimals.", async() => {
		const fungibleContract = Fungible__factory.connect(fungibleAddress, owner);
		expect(await fungibleContract.decimals()).to.equal(18);
	});


});