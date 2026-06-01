import fs from 'fs';
import path from 'path';
import { ethers } from 'hardhat';
import { BigNumber, Contract } from 'ethers';
import { keccak256 } from "@ethersproject/keccak256";
import { toUtf8Bytes } from "@ethersproject/strings";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// location
export let STORAGE1 = keccak256(toUtf8Bytes("diamond.standard.app.storage"));

// errors
export const ERRORS: {[key: string]: string} = {
	ERRD_MUST_NST: 'ERRD_MUST_NST', // ICO must be not started
	ERRW_OWNR_NOT: 'ERRW_OWNR_NOT', // Ownable: caller is not the owner
	ERRP_INDX_PAY: 'ERRP_INDX_PAY', // Wrong index
	ERRD_MUST_ONG: 'ERRD_MUST_ONG', // ICO must be ongoing
	ERRD_MUSN_BLK: 'ERRD_MUSN_BLK', // must not be blacklisted
	ERRD_TRAS_LOW: 'ERRD_TRAS_LOW', // transfer amount too low
	ERRD_TRAS_HIG: 'ERRD_TRAS_HIG', // transfer amount too high
	ERRD_MUST_WHI: 'ERRD_MUST_WHI', // must be whitelisted
	ERRD_INVT_HIG: 'ERRD_INVT_HIG', // total invested amount too high
	ERRD_HARD_CAP: 'ERRD_HARD_CAP', // amount higher than available
	ERRD_ALLO_LOW: 'ERRD_ALLO_LOW', // insuffient allowance
	ERRR_MUST_FIN: 'ERRR_MUST_FIN', // ICO must be finished
	ERRR_PASS_SOF: 'ERRR_PASS_SOF', // Passed SoftCap. No refund
	ERRR_ZERO_REF: 'ERRR_ZERO_REF', // Nothing to refund
	ERRR_WITH_REF: 'ERRR_WITH_REF', // Unable to refund
	ERRC_MUST_FIN: 'ERRC_MUST_FIN', // ICO must be finished
	ERRC_NPAS_SOF: 'ERRC_NPAS_SOF', // Not passed SoftCap
	ERRC_MISS_TOK: 'ERRC_MISS_TOK', // Provide Token
	ERRC_MISS_VAD: 'ERRC_MISS_VAD', // Provide Vesting Token
	ERRW_MUST_FIN: 'ERRW_MUST_FIN', // ICO must be finished
	ERRW_NPAS_SOF: 'ERRW_NPAS_SOF', // Not passed SoftCap
	ERRW_INVA_ADD: 'ERRW_INVA_ADD', // Invalid Address
	ERRR_ZERO_CLM: 'ERRR_ZERO_CLM', // Nothing to claim
	ERRW_MISS_WAL: 'ERRW_MISS_WAL', // Provide Wallet
	ERRR_ZERO_WIT: 'ERRR_ZERO_WIT', // Nothing to withdraw
	ERRR_WITH_BAD: 'ERRR_WITH_BAD', // Unable to withdraw
	ERRR_VEST_100: 'ERRR_VEST_100', // Vesting percentag must be smaller than 100
}

// time
export const TIME: {[key: string]: number} = {
	MILLIS_IN_MINUTE: 1000 * 60,
	MILLIS_IN_HOUR  : 1000 * 60 * 60,
	MILLIS_IN_DAY   : 1000 * 60 * 60 * 24,
	MILLIS_IN_WEEK  : 1000 * 60 * 60 * 24 * 7,
	MILLIS_IN_MONTH : 1000 * 60 * 60 * 24 * 30,
	MILLIS_IN_YEAR  : 1000 * 60 * 60 * 24 * 365,
}

export const STAGE: {[key: string]: number} = {
	NOT_CREATED: 0,
	NOT_STARTED: 1,
	ONGOING: 2,
	ONHOLD: 3,
	FINISHED: 4,
}

// currency conversions
export let numUsdPerEther: number = 1100;

export let etherToUsd = function (ether: number) {
	return ether * numUsdPerEther;
}
export let usdToEther = function (usd: number) {
	return usd / numUsdPerEther;
}
export let weiToUsd = function (wei: BigNumber) {
	return etherToUsd(Number(ethers.utils.formatEther(wei)));
}
export let usdToWei = function (usd: number) {
	return ethers.utils.parseUnits((usdToEther(usd).toString()));
}
export let stringToBytes5 = function (str: string) {
	return ethers.utils.hexZeroPad(ethers.utils.toUtf8Bytes(str), 5);
}
export let bytes5ToString = function (hexString: string) {
	return ethers.utils.toUtf8String(hexString);
}
export let tokenToUsd = async function (token: number, ico: Contract) {
	console.log("UUSD_PER_TOKEN: ");
	let tokenInfo = await ico.getPaymentToken('FOO');
	let UUSD_PER_TOKEN = tokenInfo[2];
	console.log("UUSD_PER_TOKEN: " + UUSD_PER_TOKEN);
	return token * UUSD_PER_TOKEN;
}
export let usdToToken = async function (usd: number, ico: Contract) {
	console.log("UUSD_PER_TOKEN: ");
	let tokenInfo = await ico.getPaymentToken('FOO');
	let UUSD_PER_TOKEN = tokenInfo[2];
	console.log("UUSD_PER_TOKEN: " + UUSD_PER_TOKEN);
	console.log("usdToToken: " + usd * 10**6 / UUSD_PER_TOKEN);
	return usd * 10**6 / UUSD_PER_TOKEN;
}
export let usdToTokenWithDecimals = async function (usd: number, ico: Contract) {
	let change = await usdToToken(usd, ico) * 10**18;
	return parseInt(change.toString());
}

// logs
export let logICOStatus = async (ico: Contract) => {

	console.log("\getTotaluUSDInvested: " + await ico.getTotaluUSDInvested() + " USD");

	let price = await ico.getPriceuUSD();

	let investorsCount = await ico.getInvestorsCount();
	let investors = await ico.getInvestors();
	console.log("\tInvestors: ");
	for (let i = 0; i < investorsCount; i++) {
		let ether = await ethers.provider.getBalance(investors[i]);
		let uusd = await ico.getuUSDToClaim(investors[i]);
		let tokens = Math.floor(uusd / price);
		console.log("\t\t* " + investors[i] + " ether: " + weiToUsd(ether) + " USD" + "; tokens: " + tokens + " CYGAS = " + (uusd/10**6) + " USD");
	}

}

// transfer helpers
export let testTransferCoin = async (addr: SignerWithAddress, usdAmount: number, ico: Contract) => {
	console.log("purchase of : " + usdAmount + " USD = " + usdToWei(usdAmount) + " Wei by " + addr.address);
	return await addr.sendTransaction({
		to: ico.address,
		value: usdToWei(usdAmount),
		gasPrice: '0x5b9aca00',
		gasLimit: '0x56f90',
	});
};
export let testTransferToken = async (addr: SignerWithAddress, token: string, usdAmount: number, ico: Contract, foo: Contract) => {
	console.log("purchase of : " + usdAmount + " USD of " + token + " by " + addr.address);

	let tokenInfo = await ico.getPaymentToken(token);
	let UUSD_PER_TOKEN = tokenInfo[2];
	let rawAmount = usdAmount * 1e6 / UUSD_PER_TOKEN;
	let decimals = tokenInfo[3];
	let amountToTransfer = ethers.utils.parseUnits(rawAmount.toString(), decimals).toString();
	await foo.connect(addr).approve(ico.address, amountToTransfer);
	return await ico.connect(addr).depositTokens(token, amountToTransfer);
};


// diamond
export const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }

export let getSelectors = function (contract:Contract) {
	const signatures: string[] = Object.keys(contract.interface.functions);
	return signatures.reduce((acc: string[], val) => {
			if (val !== 'init(bytes)') {
					acc.push(contract.interface.getSighash(val));
			}
			return acc;
	}, []);
}
export let removeSelectors = function (selectors: string[], removeSelectors: string[]) {
	selectors = selectors.filter(v => !removeSelectors.includes(v))
	return selectors
}
export let logSelectors = function (contract:Contract) {
	const signatures: string[] = Object.keys(contract.interface.functions);
	return signatures.reduce((acc: string[], val) => {
		console.log(val + '->' + contract.interface.getSighash(val));
		return acc;
	}, []);
}

// extractAbi
export const extractAbi = async () => {
	
	if (fs.existsSync('abi'))
		fs.rmdirSync('abi', { recursive: true });
	fs.mkdirSync('abi');

  const mainFolder = "artifacts/contracts/";
	for (const fullJsonFilePath of readAllFiles(mainFolder)) {
		const abiFileName = fullJsonFilePath.substr(fullJsonFilePath.lastIndexOf("/") + 1);
		let data: any = fs.readFileSync(fullJsonFilePath);
		fs.writeFileSync(`abi/${abiFileName}`, JSON.stringify(JSON.parse(data).abi));
	}
};

export function* readAllFiles(dir: string): Generator<string> {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      yield* readAllFiles(path.join(dir, file.name));
    } else if (!file.name.includes(".dbg.json")) {
      yield path.join(dir, file.name);
    }
  }
}
