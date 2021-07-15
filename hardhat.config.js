const { task } = require("hardhat/config");

require("@nomiclabs/hardhat-ganache");
require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-web3");
require("hardhat-contract-sizer"); //yarn run hardhat size-contracts
require("solidity-coverage"); // $ npx hardhat coverage
require("hardhat-log-remover");
require("hardhat-gas-reporter");
require('hardhat-docgen');

module.exports = {
	solidity: {
		version: "0.5.17",
		settings: {
			optimizer: {
				enabled: true,
				runs: 200,
			},
		},
	},
	contractSizer: {
		alphaSort: false,
		runOnCompile: false,
		disambiguatePaths: false,
	},
	networks: {
		hardhat: {
			blockGasLimit: 6800000
		},
		rskPublicTestnet: {
			url: "https://public-node.testnet.rsk.co/",
			accounts: { mnemonic: "brownie", count: 10 },
			network_id: 31,
			confirmations: 4,
			gasMultiplier: 1.25,
			//timeout: 20000, // increase if needed; 20000 is the default value
			//allowUnlimitedContractSize, //EIP170 contrtact size restriction temporal testnet workaround
		},
		rskPublicMainnet: {
			url: "https://public-node.rsk.co/",
			network_id: 30,
			//timeout: 20000, // increase if needed; 20000 is the default value
		},
		rskSovrynTestnet: {
			url: "https://testnet.sovryn.app/rpc",
			accounts: { mnemonic: "brownie", count: 10 },
			network_id: 31,
			confirmations: 4,
			gasMultiplier: 1.25,
			//timeout: 20000, // increase if needed; 20000 is the default value
			//allowUnlimitedContractSize, //EIP170 contrtact size restriction temporal testnet workaround
		},
		rskSovrynMainnet: {
			url: "https://mainnet.sovryn.app/rpc",
			network_id: 30,
			//timeout: 20000, // increase if needed; 20000 is the default value
		},
	},
	paths: {
		sources: "./contracts",
		tests: "./tests",
	},
	mocha: {
		timeout: 800000,
	},
	docgen: {
		path: './docs',
		clear: true
	},
	gasReporter: {
		enabled: true
	}
};
