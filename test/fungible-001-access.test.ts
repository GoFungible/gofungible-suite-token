import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import * as helpers from "./_testhelper";
import { Fungible__factory } from "../typechain-types";

describe("Deploy Token", function () {
	let owner: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;
	let fungibleAddress: string;
	let gatewayAddress: string;

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
		// ************************************************************************* Deploy Contracts ****************************************************************
		// ***********************************************************************************************************************************************************
		// deploy Fungible
		const Fungible = await ethers.getContractFactory("Fungible");
		let fungible = await Fungible.deploy("FungiTest", "FGT", 1000_000_000);
		await fungible.waitForDeployment();
		fungibleAddress = await fungible.getAddress();
		console.log(" Fungible deployed to:", fungibleAddress);

		// deploy gateway
		const MockedERC7786Gateway = await ethers.getContractFactory("MockedERC7786Gateway");
		let mockedGateway = await MockedERC7786Gateway.deploy();
		await mockedGateway.waitForDeployment();
		gatewayAddress = await mockedGateway.getAddress();
		console.log(" MockedGateway deployed to:", gatewayAddress);

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
	/********************************************** Only Owner Accounts**************************************/
	/********************************************************************************************************/
	it("Only Owner functions are ok for owner", async() => {
		const fungibleContract = Fungible__factory.connect(fungibleAddress, owner);

		// EIP-155 / EIP-1344
		await expect(() => fungibleContract.chainId()).to.not.throw();

		// erc-173 functions
		await expect(() => fungibleContract.owner()).to.not.throw();
		await expect(fungibleContract.transferOwnership(owner.address)).to.not.be.reverted;

		// erc-20 functions
		await expect(() => fungibleContract.name()).to.not.throw();
		await expect(() => fungibleContract.symbol()).to.not.throw();
		await expect(() => fungibleContract.decimals()).to.not.throw();
		await expect(fungibleContract.totalSupply()).to.not.be.reverted;
		await expect(fungibleContract.balanceOf(owner)).to.not.be.reverted;
		await expect(fungibleContract.transfer(addr1.address, ethers.parseUnits("10", 18))).to.not.be.reverted;
		await expect(fungibleContract.approve(addr1.address, ethers.parseUnits("10", 18))).to.not.be.reverted;
		await expect(fungibleContract.allowance(owner.address, addr1.address)).to.not.be.reverted;
		await expect(fungibleContract.connect(addr1).transferFrom(owner.address, addr1.address, ethers.parseUnits("10", 18))).to.not.be.reverted;

		// erc-7866 functions
		await expect(() => fungibleContract.gateway()).to.not.throw();
		await expect(fungibleContract.receiveMessage(ethers.encodeBytes32String("msg-001"), addr1.address, ethers.toUtf8Bytes("Hello from chain"))).to.be.revertedWithCustomError(fungibleContract, "GatewayRequired");

		// erc-20n functions
		await expect(fungibleContract.getChains()).to.not.be.reverted;
		await expect(fungibleContract.bind(0, addr1)).to.be.revertedWithCustomError(fungibleContract, "NonZeroValueRequired");
		await expect(fungibleContract.unbind(0)).to.be.revertedWithCustomError(fungibleContract, "NonZeroValueRequired");
		await expect(() => fungibleContract.getChainAddress(0)).to.not.throw();
		await expect(() => fungibleContract.getMasterChain()).to.not.throw();
		await expect(() => fungibleContract.getMasterAddress()).to.not.throw();
		await expect(fungibleContract.setAsMasterChain()).to.not.be.reverted;
		await expect(fungibleContract.transferMasterChain(1337)).to.not.be.reverted;
		await expect(() => fungibleContract.getChainSupply(0)).to.not.throw();
		await expect(fungibleContract.bridge(25, addr1.address, ethers.parseUnits("10", 18))).to.be.revertedWithCustomError(fungibleContract, "GatewayRequired");
		await expect(fungibleContract.pay(25, addr1.address, ethers.parseUnits("10", 18))).to.be.revertedWithCustomError(fungibleContract, "GatewayRequired");

		// extensions functions
		await expect(fungibleContract.addResource(45, 1, fungibleAddress, 0, 10, 10)).to.not.be.reverted;
		await expect(() => fungibleContract.getPendingResourcesIds()).to.not.throw();
		await expect(fungibleContract.releaseResource(45, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		await expect(fungibleContract.writeConfig(ethers.encodeBytes32String("admin_role"), ethers.encodeBytes32String("super_user"))).to.not.be.reverted;
		await expect(() => fungibleContract.readConfig(ethers.encodeBytes32String("admin_role"))).to.not.throw();
		await expect(fungibleContract.updateConfiguration(addr3, ethers.hexlify(ethers.toUtf8Bytes("Arbitrary configuration data here")))).to.not.be.reverted;

	});

	it("Not Owner not extension functions are not ok for owner and extensions", async() => {
		/*const fungibleContract = Fungible__factory.connect(fungibleAddress, addr1);
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

		await expect(fungibleContract.transferX(25, addr1.address, ethers.parseUnits("10", 18))).to.be.revertedWith('Ownable: caller is not the owner');

		await expect(fungibleContract.connect(addr1).addResource(45, 1, fungibleAddress, 0, 10, 10)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(fungibleContract.connect(addr1).getPendingResourcesIds()).to.not.be.reverted;
		await expect(fungibleContract.releaseResource(45, 0)).to.be.revertedWith('Ownable: caller is not the owner');*/
		
	});

	it("Only Gateway functions are ok for gateway", async() => {
		const fungibleContract = Fungible__factory.connect(fungibleAddress, addr1);
		//const gatewayContract = MockedGateway__factory.connect(gatewayAddress, addr1);

		// set gateway
		await expect(fungibleContract.connect(owner).addResource(0, 1, gatewayAddress, 0, 0, 0)).to.not.be.reverted;
		await expect(fungibleContract.connect(owner).releaseResource(0, 0)).to.be.revertedWith("Resource: releaseDate is not valid.");
		await expect(() => fungibleContract.gateway()).to.not.throw();

		// erc-173 functions
		/*await expect(() => fungibleContract.owner()).to.throw();
		await expect(fungibleContract.transferOwnership(owner.address)).to.be.revertedWith('Ownable: caller is not the owner');

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

		await expect(fungibleContract.transferX(25, addr1.address, ethers.parseUnits("10", 18))).to.be.revertedWith('Ownable: caller is not the owner');

		await expect(fungibleContract.connect(addr1).addResource(45, 1, fungibleAddress, 0, 10, 10)).to.be.revertedWith('Ownable: caller is not the owner');
		await expect(fungibleContract.connect(addr1).getPendingResourcesIds()).to.not.be.reverted;
		await expect(fungibleContract.releaseResource(45, 0)).to.be.revertedWith('Ownable: caller is not the owner');*/
		
	});

	/********************************************************************************************************/
	/************************************ Extensions Update Fungible Variables ******************************/
	/********************************************************************************************************/
	it("No staticcall extension can update Fungible", async() => {

		
	});

	it("DelegateCall extension can update Fungible", async() => {

		
	});

	/********************************************************************************************************/
	/********************************************** Update Owner ********************************************/
	/********************************************************************************************************/
	it("Can update owner with no extension", async() => {

		
	});

	/********************************************************************************************************/
	/********************************************** Update Owner Extension **********************************/
	/********************************************************************************************************/
	it("Owner extension can update owner", async() => {

		
	});

});