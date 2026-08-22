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

export type Bytes4 = `0x${string}`;

interface WaitForEventOptions {
  contract: ethers.Contract;
  eventName: string;
  timeoutMs?: number;
  // A predicate function to match specific criteria (e.g., matching a unique requestId)
  filterPredicate?: (...args: any[]) => boolean;
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
    // 1. Safety Timeout Setup
    const timeout = setTimeout(() => {
      contract.off(eventName, listener); // Prevent memory leaks
      reject(new Error(`Timeout: Event "${eventName}" was not emitted within ${timeoutMs}ms.`));
    }, timeoutMs);

    // 2. The Universal Listener Wrapper
    const listener = (...args: any[]) => {
      // If a custom filter is provided (like checking a requestId), evaluate it
      if (filterPredicate && !filterPredicate(...args)) {
        return; // Skip this event emission; it's not the one we are waiting for
      }

      // Found a match! Clean up and resolve
      clearTimeout(timeout);
      contract.off(eventName, listener);
      resolve(args);
    };

    // 3. Register the event with ethers v6
    contract.on(eventName, listener);
  });
}