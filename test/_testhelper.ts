import { BigNumberish, ethers } from 'ethers';
import { keccak256 } from "@ethersproject/keccak256";
import { toUtf8Bytes } from "@ethersproject/strings";

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

// currency conversions
export let numUsdPerEther: number = 1100;

export let etherToUsd = function (ether: number) {
	return ether * numUsdPerEther;
}
export let usdToEther = function (usd: number) {
	return usd / numUsdPerEther;
}
export let weiToUsd = function (wei: BigNumberish) {
	return etherToUsd(Number(ethers.formatEther(wei)));
}
export let usdToWei = function (usd: number) {
	return ethers.parseUnits((usdToEther(usd).toString()));
}
export let stringToBytes5 = function (str: string) {
	return ethers.zeroPadValue(ethers.toUtf8Bytes(str), 5);
}
export let bytes5ToString = function (hexString: string) {
	return ethers.toUtf8String(hexString);
}

interface WaitForEventOptions {
  contract: ethers.BaseContract;
  eventName: string;
  timeoutMs?: number;
  filterPredicate?: (...args: any[]) => boolean;	// A predicate function to match specific criteria (e.g., matching a unique requestId)
}

/**
 * Universally waits for any ethers.js v6 contract event to fire.
 * @returns An array containing all arguments emitted by the event.
 */
export function waitForContractEvent({
  contract,
  eventName,
  timeoutMs = 5000, // 5 second default timeout
  filterPredicate
}: WaitForEventOptions): Promise<any[]> {
  
  return new Promise((resolve, reject) => {
		console.log(`WaitForEventOptions1`);

		const start: number = performance.now();
		console.log(`WaitForEventOptions2`);

    // 1. Safety Timeout Setup
    const timeout = setTimeout(() => {
      contract.off(eventName, listener); // Prevent memory leaks
      reject(new Error(`Timeout: Event "${eventName}" was not emitted within ${timeoutMs}ms.`));
    }, timeoutMs);
		console.log(`WaitForEventOptions3`);

    // 2. The Universal Listener Wrapper
    const listener = (...args: any[]) => {
      // If a custom filter is provided (like checking a requestId), evaluate it
      if (filterPredicate && !filterPredicate(...args)) {
        return; // Skip this event emission; it's not the one we are waiting for
      }
			console.log(`WaitForEventOptions4`);
			console.log(eventName);

      // Found a match! Clean up and resolve
			console.log(`Operation delayed ${performance.now() - start} ms`);
      clearTimeout(timeout);
      contract.off(eventName, listener);
			console.log(`listener removed`);
      resolve(args);
    };
		console.log(`WaitForEventOptions5`);

    // 3. Register the event with ethers v6
    contract.on(eventName, listener);
  });
}


export type Bytes4 = `0x${string}`;

export const NO_SELECTOR: string = "0x00000000";
export let selector = function (signature: string) {
	return ethers.id(signature).slice(0, 10);
}

export const ZeroAddressRequiredError = "ZeroAddressRequired(address nonZeroAddress)";		// 0x926be0ae
export const ZeroValueRequiredError = "ZeroValueRequired(uint256 nonZeroVaue)";						// 0x51be93a0
export const NonZeroAddressRequiredError = "NonZeroAddressRequired()";										// 0xd357d001
export const NonZeroValueRequiredError = "NonZeroValueRequired()";												// 0x8f8b9fd4

export const OnlyOwnerError = "OnlyOwner(address sender)";																// 0x907433a7
export const OnlyGatewayError = "OnlyGateway(address sender)";														// 0xfe0858c6

export const GatewayRequiredError = "GatewayRequired(address sender)";										// 0xee88ae73

export const OnlyBindToOtherChainError = "OnlyBindToOtherChain()";												// 0x191c314d
export const OnlyBindFromMasterChainError = "OnlyBindFromMasterChain()";									// 0x314cc367
export const OnlyBindToSingletonChainError = "OnlyBindToSingletonChain()";								// 0xf530503f
export const OnlyBindToEmptyTokenError = "OnlyBindToEmptyToken(uint256)";									// 0x4087ed04
export const OnlyUnbindFromOtherChainError = "OnlyUnbindFromOtherChain()";								// 0x491b56c3
export const OnlyUnbindFromMasterChainError = "OnlyUnbindFromMasterChain()";							// 0xd23243c5
export const OnlyUnbindFromSlaveChainError = "OnlyUnbindFromSlaveChain()";								// 0x98971510
export const OnlyMasterChainError = "OnlyMasterChain(uint256 chain)";											// 0x38cd76ac
export const OnlySlaveChainError = "OnlySlaveChain(uint256 chain)";												// 0xbdcf02ba
export const OnlySingletonChainError = "OnlySingletonChain(uint256 chain)";								// 0xa1a81528
export const ErrorInCrossChainMessageError = "ErrorInCrossChainMessage()";								// 0xf874e27f
export const ErrorInCrossChainBindError = "ErrorInCrossChainBind()";											// 0x4d6b778d

export const UNIVERSAL_ERRORS_ABI = [
	`error ${ZeroAddressRequiredError}`,
	`error ${ZeroValueRequiredError}`,
	`error ${NonZeroAddressRequiredError}`,
	`error ${NonZeroValueRequiredError}`,

	`error ${OnlyOwnerError}`,
	`error ${OnlyGatewayError}`,

	`error ${GatewayRequiredError}`,

	`error ${OnlyBindToOtherChainError}`,
	`error ${OnlyBindFromMasterChainError}`,
	`error ${OnlyBindToSingletonChainError}`,
	`error ${OnlyBindToEmptyTokenError}`,
	`error ${OnlyUnbindFromOtherChainError}`,
	`error ${OnlyUnbindFromMasterChainError}`,
	`error ${OnlyUnbindFromSlaveChainError}`,

	`error ${OnlyMasterChainError}`,
	`error ${OnlySlaveChainError}`,
	`error ${OnlySingletonChainError}`,

	`error ${ErrorInCrossChainMessageError}`,
	`error ${ErrorInCrossChainBindError}`,
];
export const universalInterface = new ethers.Interface(UNIVERSAL_ERRORS_ABI);
