import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Deploy Extension", function () {

  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

	let owner: SignerWithAddress, project: SignerWithAddress, liquidity: SignerWithAddress;
	let addr1: SignerWithAddress, addr2: SignerWithAddress, addr3: SignerWithAddress, addrs;

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
		[owner, project, liquidity, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
		[owner, project, liquidity, addr1, addr2, addr3, ...addrs].forEach(async(account, i) => {
			let balance = await ethers.provider.getBalance(account.address);
			console.log('%d - address: %s ; balance: %s', ++i, account.address, balance);
		});



	});

	afterEach(async() => {

	});
	
	after(async() => {
		console.log('--------- Ending Tests --------');
	});



	it("Initial Logs.", async() => {



	});


	/********************************************************************************************************/
	/********************************************** Reentrancy **********************************************/
	/********************************************************************************************************/
	it("Should consume less than 50,000 gas", async function () {
    //const tx = await vault.deposit({ value: ethers.utils.parseEther("1") });
    //const receipt = await tx.wait();
    //expect(receipt.gasUsed.toNumber()).to.be.lessThan(50000);
	});


	

	
	


});