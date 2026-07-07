import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6"
  },
	gasReporter: {
		//enabled: process.env.REPORT_GAS !== undefined,
		enabled: true,                    		// Generate reports when running tests
		currency: "USD",                  		// Show costs in USD
		//showMethodSig: true,
		//showTimeSpent:true,
		coinmarketcap: process.env.CMC_ID,    // Get price data (optional, free tier available)
    //etherscan: "your-etherscan-key",  // For L2 gas price data (optional)
		// gasPriceApi: 'https://api.etherscan.io/api?module=proxy&action=eth_gasPrice',		// ethereum
		// token: 'ETH'
		// gasPriceApi: 'https://api.bscscan.com/api?module=proxy&action=eth_gasPrice',			// BSC
		// token: 'BNB'
		gasPriceApi: 'https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice',		// polygon
		token: 'MATIC',
		reportPureAndViewMethods: true,
    excludeContracts: ["Migrations"], // Exclude specific contracts
	},
};

export default config;