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

		// get accounts for hardhat chain
		/*[owner1, addr11, addr12, addr13, ...addrs1] = await ethers.getSigners();
		[owner1, addr11, addr12, addr13, ...addrs1].forEach(async(account, i) => {
			let balance = await ethers.provider.getBalance(account.address);
			console.log('Hardhat: Account %d - address: %s ; balance: %s', ++i, account.address, balance);
		});*/
	});

	beforeEach(async() => {
		//console.log('--------------------');
		await hre.network.provider.send("hardhat_reset");

		// ***********************************************************************************************************************************************************
		// ************************************************************************** Log Signers ********************************************************************
		// ***********************************************************************************************************************************************************
		// reset accounts for hardhat chain
		//[owner1, addr11, addr12, addr13, ...addrs1] = await ethers.getSigners();

		// reset accounts for hardhat2 chain
		/*const privateKeys: any = hre.config.networks.hardhat2.accounts as string[];
		const hardhat2Provider = new ethers.JsonRpcProvider("http://127.0.0.1:8546");
		[owner2, addr21, addr22, addr23, ...addrs2] =  privateKeys.map((privateKey: string) => 
      new ethers.Wallet(privateKey, hardhat2Provider)
    );*/

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




});