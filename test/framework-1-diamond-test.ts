import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Test1Facet, Test2Facet } from '../typechain';

// describe.skip
describe.skip("framework-1-diamond-test", function () {
	let owner: SignerWithAddress;
  let diamondCutFacet: Contract, diamondLoupeFacet: Contract;
  let diamondCutContract: Contract, diamondLoupeContract: Contract;
  let diamond: Contract;

	/********************************************************************************************************/
	/********************************************** deployment utils ****************************************/
	/********************************************************************************************************/
	const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }

	let getSelectors = function (contract:Contract) {
    const signatures: string[] = Object.keys(contract.interface.functions);
    return signatures.reduce((acc: string[], val) => {
        if (val !== 'init(bytes)') {
            acc.push(contract.interface.getSighash(val));
        }
        return acc;
    }, []);
	}

	async function diamondAsFacet (diamond:Contract, facetName:string):Promise<Contract> {
    return await ethers.getContractAt(facetName, diamond.address);
	}

	/********************************************************************************************************/
	/************************************************** hooks ***********************************************/
	/********************************************************************************************************/
	before(async() => {
		console.log('-------- Starting Tests -------');

		const accounts = await ethers.getSigners()
		owner = accounts[0]

		// deploy DiamondCutFacet
		const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet')
		diamondCutFacet = await DiamondCutFacet.deploy()
		await diamondCutFacet.deployed()
		console.log('DiamondCutFacet deployed:', diamondCutFacet.address)

		// deploy DiamondLoupeFacet
		const DiamondLoupeFacet = await ethers.getContractFactory('DiamondLoupeFacet')
		diamondLoupeFacet = await DiamondLoupeFacet.deploy()
		await diamondLoupeFacet.deployed()
		console.log('DiamondLoupeFacet deployed:', diamondLoupeFacet.address)

		// deploy Diamond
		const Diamond = await ethers.getContractFactory('Diamond')
		diamond = await Diamond.deploy(diamondCutFacet.address)
		await diamond.deployed()
		console.log('Diamond deployed:', diamond.address)

		// get contracts on Diamond
		diamondCutContract = await ethers.getContractAt('DiamondCutFacet', diamond.address)
    diamondLoupeContract = await ethers.getContractAt('DiamondLoupeFacet', diamond.address)

	  // initialize to attach facets to diamond
		const _diamondCut = [{ facetAddress: diamondLoupeFacet.address, action: FacetCutAction.Add, functionSelectors: getSelectors(diamondLoupeFacet), }];
		await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;
		console.log('Diamond initialized:',)
	});

	beforeEach(async() => {
		console.log('--------------------');
	});

	afterEach(async() => {
		console.log('--------------------');
	});
	
	after(async() => {
		console.log('--------- Ending Tests --------');
	});

	/********************************************************************************************************/
	/********************************************** DiamondLoupe ********************************************/
	/********************************************************************************************************/
	describe('DiamondLoupe', () => {

		it('should have three facets -- call to facetAddresses function', async () => {
			const addresses = await diamondLoupeContract.facetAddresses();

			expect(addresses.length).to.be.equal(2);
			expect(addresses).to.eql([diamondCutFacet.address, diamondLoupeFacet.address/*, ownershipFacet.address*/]);
		})

		it('has correct function selectors linked to facet', async function () {
			let selectors: Array<string> = getSelectors(diamondCutFacet);
			console.log('selectors::', selectors);
			expect(await diamondLoupeContract.facetFunctionSelectors(diamondCutFacet.address)).to.deep.equal(selectors);

			selectors = getSelectors(diamondLoupeFacet);
			console.log('selectors::', selectors);
			expect(await diamondLoupeContract.facetFunctionSelectors(diamondLoupeFacet.address)).to.deep.equal(selectors);
		});

		it('associates selectors correctly to facets', async function () {
			for (const sel of getSelectors(diamondLoupeFacet)) {
					expect(await diamondLoupeContract.facetAddress(sel)).to.be.equal(diamondLoupeFacet.address);
			}

			for (const sel of getSelectors(diamondCutFacet)) {
					expect(await diamondLoupeContract.facetAddress(sel)).to.be.equal(diamondCutFacet.address);
			}
		});

		it('returns correct response when facets() is called', async function () {
			const facets = await diamondLoupeContract.facets();

			expect(facets[0].facetAddress).to.equal(diamondCutFacet.address);
			expect(facets[0].functionSelectors).to.eql(getSelectors(diamondCutFacet));

			expect(facets[1].facetAddress).to.equal(diamondLoupeFacet.address);
			expect(facets[1].functionSelectors).to.eql(getSelectors(diamondLoupeFacet));
		});

	});

	/********************************************************************************************************/
	/********************************************** DiamondLoupe ********************************************/
	/********************************************************************************************************/
	describe('DiamondCut', () => {

		let test1Facet: Contract, test2Facet: Contract;
		let snapshotId: any;

		beforeEach(async function () {
			snapshotId = await ethers.provider.send('evm_snapshot', []);

			// deploy Test1Facet
			const Test1Facet = await ethers.getContractFactory('Test1Facet')
			test1Facet = await Test1Facet.deploy()
			await test1Facet.deployed()
			console.log('Test1Facet deployed:', test1Facet.address)

			// deploy Test2Facet
			const Test2Facet = await ethers.getContractFactory('Test2Facet')
			test2Facet = await Test2Facet.deploy()
			await test2Facet.deployed()
			console.log('Test2Facet deployed:', test2Facet.address)
		});

		afterEach(async function () {
			await ethers.provider.send('evm_revert', [snapshotId]);
		});

		it('allows adding functions', async function () {
			// remove 'supportsInterface(bytes4)'
			const selectors = getSelectors(test1Facet).filter((e, i) => e !== test1Facet.interface.getSighash('supportsInterface(bytes4)')); 

			// attach Test1Facet
			const _diamondCut = [{ facetAddress: test1Facet.address, action: FacetCutAction.Add, functionSelectors: selectors, }];
			await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;

			const facets = await diamondLoupeContract.facets();
			expect(facets[2].facetAddress).to.eql(test1Facet.address);
			expect(facets[2].functionSelectors).to.eql(selectors);

			const test1 = (await diamondAsFacet(diamond, 'Test1Facet')) as Test1Facet;
			await expect(test1.test1Func1()).to.not.be.reverted
		});

		it('allows replacing functions', async function () {
			// take selectors except 'supportsInterface(bytes4)'
			const selectors = getSelectors(test1Facet).filter((e, i) => e !== test1Facet.interface.getSighash('supportsInterface(bytes4)')); 

			// attach Test1Facet
			let _diamondCut = [{ facetAddress: test1Facet.address, action: FacetCutAction.Add, functionSelectors: selectors, }];
			await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;

			// invoke old function
			const test1 = (await diamondAsFacet(diamond, 'Test1Facet')) as Test1Facet;
			console.log(await test1.test1Func1())
			expect(await test1.test1Func1()).to.be.equal('1111');

			// replace function
			const selectorTest1Func1 = test1Facet.interface.getSighash('test1Func1()');
			console.log('selectorTest1Func1', selectorTest1Func1);
			_diamondCut = [{ facetAddress: test2Facet.address, action: FacetCutAction.Replace, functionSelectors: [ selectorTest1Func1 ], }];
			await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;

			// invoke new function
			const test2 = (await diamondAsFacet(diamond, 'Test2Facet')) as Test2Facet;
			expect(await test2.test1Func1()).to.be.equal(1234);
		});

		it('allows removing functions', async function () {
			// take selectors except 'supportsInterface(bytes4)'
			const selectors = getSelectors(test1Facet).filter((e, i) => e !== test1Facet.interface.getSighash('supportsInterface(bytes4)')); 

			// attach Test1Facet
			let _diamondCut = [{ facetAddress: test1Facet.address, action: FacetCutAction.Add, functionSelectors: selectors, }];
			await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;

			// invoke function
			const test1 = (await diamondAsFacet(diamond, 'Test1Facet')) as Test1Facet;
			console.log(await test1.test1Func1())
			expect(await test1.test1Func1()).to.be.equal('1111');

			// remove function
			const selectorTest1Func1 = test1Facet.interface.getSighash('test1Func1()');
			_diamondCut = [{ facetAddress: '0x0000000000000000000000000000000000000000', action: FacetCutAction.Remove, functionSelectors: [ selectorTest1Func1 ], }];
			await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;

			// invoke function
			await expect(test1.test1Func1()).to.be.revertedWith('Diamond: Function does not exist');
		});



	});

	/********************************************************************************************************/
	/********************************************** DiamondLoupe ********************************************/
	/********************************************************************************************************/
	describe('Cache bug test', () => {

		let test1Facet: Contract;
		let snapshotId: any;

		beforeEach(async function () {
			snapshotId = await ethers.provider.send('evm_snapshot', []);

			// deploy Test1Facet
			const Test1Facet = await ethers.getContractFactory('Test1Facet')
			test1Facet = await Test1Facet.deploy()
			await test1Facet.deployed()
			console.log('Test1Facet deployed:', test1Facet.address)
		});

		afterEach(async function () {
			await ethers.provider.send('evm_revert', [snapshotId]);
		});

		it('should not exhibit the cache bug', async () => {

			const ownerSel = '0x8da5cb5b'
			const sel0 = '0x19e3b533' // fills up slot 1
			const sel1 = '0x0716c2ae' // fills up slot 1
			const sel2 = '0x11046047' // fills up slot 1
			const sel3 = '0xcf3bbe18' // fills up slot 1
			const sel4 = '0x24c1d5a7' // fills up slot 1
			const sel5 = '0xcbb835f6' // fills up slot 1
			const sel6 = '0xcbb835f7' // fills up slot 1
			const sel7 = '0xcbb835f8' // fills up slot 2
			const sel8 = '0xcbb835f9' // fills up slot 2
			const sel9 = '0xcbb835fa' // fills up slot 2
			const sel10 = '0xcbb835fb' // fills up slot 2

			let selectors = [
				sel0,
				sel1,
				sel2,
				sel3,
				sel4,
				sel5,
				sel6,
				sel7,
				sel8,
				sel9,
				sel10
			]

			// add selectors
			let _diamondCut = [{ facetAddress: test1Facet.address, action: FacetCutAction.Add, functionSelectors: selectors, }];
			await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;

			// remove selectors
			_diamondCut = [{ facetAddress: '0x0000000000000000000000000000000000000000', action: FacetCutAction.Remove, functionSelectors: [ /*ownerSel,*/ sel5, sel10 ], }];
			await expect(diamondCutContract.connect(owner).diamondCut(_diamondCut)).to.not.be.reverted;

			// Get the test1Facet's registered functions
			selectors = await diamondLoupeContract.facetFunctionSelectors(test1Facet.address)

			// Check individual correctness
			expect(selectors).to.include(sel0);
			expect(selectors).to.include(sel1);
			expect(selectors).to.include(sel2);
			expect(selectors).to.include(sel3);
			expect(selectors).to.include(sel4);
			expect(selectors).to.include(sel6);
			expect(selectors).to.include(sel7);
			expect(selectors).to.include(sel8);
			expect(selectors).to.include(sel9);
			expect(selectors).to.not.include(ownerSel);
			expect(selectors).to.not.include(sel10);
			expect(selectors).to.not.include(sel5);
		})

	});

});