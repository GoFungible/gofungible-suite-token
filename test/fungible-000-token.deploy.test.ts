// test/network.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import hre from "hardhat";
import { Signer } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import * as helpers from "../test/_testhelper";

describe("Blockchain Network", function () {
  let user1: Signer;
  let user2: Signer;

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
		// deploy DiamondCutFacet (CUD)
		const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet')
		let diamondCutFacet = await DiamondCutFacet.deploy()
		await diamondCutFacet.waitForDeployment()
		console.log('DiamondCutFacet deployed:', await diamondCutFacet.getAddress())

		// deploy DiamondLoupeFacet (R)
		const DiamondLoupeFacet = await ethers.getContractFactory('DiamondLoupeFacet')
		let diamondLoupeFacet = await DiamondLoupeFacet.deploy()
		await diamondLoupeFacet.waitForDeployment()
		console.log('DiamondLoupeFacet deployed:', await diamondLoupeFacet.getAddress())
		console.log(diamondLoupeFacet)

		// deploy Fungible
		const Fungible = await ethers.getContractFactory("Fungible");
		let fungible = await Fungible.deploy("FungiTest", "FGT", 1000_000_000);
		await fungible.waitForDeployment();
		console.log("Fungible deployed:" + await fungible.getAddress());

		// Attach Facets to Fungible via DiamondCut
		// attach DiamondLoupeFacet
		/*const diamondLoupeFacetSelectors = helpers.getSelectors(diamondLoupeFacet);
		let _diamondCut = [{ facetAddress: diamondLoupeFacet.getAddress(), action: helpers.FacetCutAction.Add, functionSelectors: diamondLoupeFacetSelectors, }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
    diamondLoupeContract = await ethers.getContractAt('DiamondLoupeFacet', diamond.getAddress())
		console.log("DiamondLoupeFacet attached as " + diamondCutContract.address);

		// attach Token facet ex Common
		const erc20FacetExCommonFacetSelectors = helpers.removeSelectors(helpers.getSelectors(erc20Facet), helpers.getSelectors(commonFacet));
		_diamondCut = [{ facetAddress: fungible.getAddress(), action: helpers.FacetCutAction.Add, functionSelectors: erc20FacetExCommonFacetSelectors, }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
    token = await ethers.getContractAt('ERC20Facet', diamond.getAddress())
		console.log("ERC20Facet attached as " + token.address);*/

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