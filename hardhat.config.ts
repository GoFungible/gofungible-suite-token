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
    hardhat2: {
      url: "http://127.0.0.1:8546",
      chainId: 9999, // Different chain ID
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",  	// Account 0 - Owner
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",		// Account 1
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",		// Account 2
        "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",		// Account 3
        "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",		// Account 4
        "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba"		// Account 5
      ]
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
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