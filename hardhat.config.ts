// import * as dotenv from "dotenv";
const dotenv = require("dotenv")

require("@nomiclabs/hardhat-etherscan")
require("@nomiclabs/hardhat-waffle")
require("@typechain/hardhat")
require("hardhat-gas-reporter")
require("solidity-coverage")
require("hardhat-contract-sizer")
require("hardhat-gas-reporter")
require("hardhat-deploy")
require('@openzeppelin/hardhat-upgrades')

dotenv.config();

const config = {
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
    networks: {
        localhost: {
            url: "http://localhost:8545",
        },
        bsctestnet: {
            url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
            accounts: {
                mnemonic: process.env.MNEMONIC || '',
            },
        },
        rinkeby: {
            url: process.env.RINKEBY_URL || "",
            accounts: {
                mnemonic: process.env.MNEMONIC || '',
            },
            verify: {
                etherscan: {
                    apiUrl: "https://api-rinkeby.etherscan.io/",
                },
            },
        },
        ropsten: {
            url: process.env.ROPSTEN_URL || "",
            accounts: {
                mnemonic: process.env.MNEMONIC || '',
            },
            verify: {
                etherscan: {
                    apiUrl: "https://api-ropsten.etherscan.io/",
                },
            },
        },
        hardhat: {
            allowUnlimitedContractSize: true,
        }
    },
    solidity: {
        version: "0.8.4",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    mocha: {
        timeout: 40000,
    },
    gasReporter: {
        currency: "USD",
        gasPrice: 100,
        // enabled: process.env.REPORT_GAS ? true : false,
    },
    contractSizer: {
        alphaSort: true,
        disambiguatePaths: false,
        runOnCompile: true,
        strict: true,
    },
    verify: {
        etherscan: {
            apiKey: process.env.ETHERSCAN_API_KEY,
        },
    },
};

module.exports = config
