const hre = require("hardhat");

const terminalAddress = "0xDAC51bA5Ca900A9729C15F4f300464329E9290Cc";
const daoGovernorBoosterAddress = "0x87b415B8C5eB735e1496DD747Bbab282187Bce69";

const config = [
    [
        {
            handle: hre.ethers.utils.formatBytes32String("SolidityLearning123"),
            customBoosters: [],
            boosterMultipliers: [],
        },
        [
            {
                tierFee: "1000",
                tierCapacity: "100",
                multiplier: "2",
            },
            {
                tierFee: "500",
                tierCapacity: "500",
                multiplier: "1",
            },
        ],
        {
            lockRate: "5000",
            duration: "10",
            cycleLimit: "10",
            target: `${Math.pow(10, 18) * 0.5}`,
        },
        [
            {
                id: "0",
                salePrice: `${Math.pow(10, 14)}`,
                saleAmount: "50",
                communityAmount: "10",
                reservedAmount: "40",
                communityVoucher: "0x4AE21C50Fed572D3220f77D202a838b593f63160",
            },
            {
                id: "1",
                salePrice: `${Math.pow(10, 13)}`,
                saleAmount: "200",
                communityAmount: "20",
                reservedAmount: "280",
                communityVoucher: "0x4AE21C50Fed572D3220f77D202a838b593f63160",
            },
        ],
        [{ beneficiary: "0x33aaE4F4bA8019704137703Fe808F6B172D72D6B", percent: "10000" }],
    ],
    [
        {
            handle: hre.ethers.utils.formatBytes32String("PeaveLove"),
            customBoosters: [
                "0x277fc3471ab37F9D654f64876b020d960d93a765",
                "0xC7B0933473fe1beE049608382EbaEBA030a8A7D0",
            ],
            boosterMultipliers: [200, 150],
        },
        [
            {
                tierFee: "1000",
                tierCapacity: "1000",
                multiplier: "2",
            },
            {
                tierFee: "150",
                tierCapacity: "5000",
                multiplier: "1",
            },
        ],
        {
            lockRate: "5000",
            duration: "1",
            cycleLimit: "10",
            target: `${Math.pow(10, 18) * 500}`,
        },
        [
            {
                id: "0",
                salePrice: `${Math.pow(10, 13)}`,
                saleAmount: "500",
                communityAmount: "100",
                reservedAmount: "400",
                communityVoucher: "0x4AE21C50Fed572D3220f77D202a838b593f63160",
            },
            {
                id: "1",
                salePrice: `${Math.pow(10, 12)}`,
                saleAmount: "2000",
                communityAmount: "200",
                reservedAmount: "2800",
                communityVoucher: "0x4AE21C50Fed572D3220f77D202a838b593f63160",
            },
        ],
        [
            { beneficiary: "0x33aaE4F4bA8019704137703Fe808F6B172D72D6B", percent: "5000" },
            { beneficiary: "0x277fc3471ab37F9D654f64876b020d960d93a765", percent: "5000" },
        ],
    ],
    [
        {
            handle: hre.ethers.utils.formatBytes32String("VincelTestDao"),
            customBoosters: [
                "0x277fc3471ab37F9D654f64876b020d960d93a765",
                "0xC7B0933473fe1beE049608382EbaEBA030a8A7D0",
            ],
            boosterMultipliers: [200, 150],
        },
        [
            {
                tierFee: "1000",
                tierCapacity: "1000",
                multiplier: "2",
            },
            {
                tierFee: "150",
                tierCapacity: "5000",
                multiplier: "1",
            },
        ],
        {
            lockRate: "6000",
            duration: "1",
            cycleLimit: "10",
            target: `${Math.pow(10, 18) * 500}`,
        },
        [
            {
                id: "0",
                salePrice: `${Math.pow(10, 15)}`,
                saleAmount: "500",
                communityAmount: "100",
                reservedAmount: "400",
                communityVoucher: "0x4AE21C50Fed572D3220f77D202a838b593f63160",
            },
            {
                id: "1",
                salePrice: `${Math.pow(10, 14)}`,
                saleAmount: "2000",
                communityAmount: "200",
                reservedAmount: "2800",
                communityVoucher: "0x4AE21C50Fed572D3220f77D202a838b593f63160",
            },
        ],
        [
            { beneficiary: "0x33aaE4F4bA8019704137703Fe808F6B172D72D6B", percent: "5000" },
            { beneficiary: "0x277fc3471ab37F9D654f64876b020d960d93a765", percent: "5000" },
        ],
    ],
    [
        {
            handle: hre.ethers.utils.formatBytes32String("Soli111dityLexxxxxarning"),
            customBoosters: [],
            boosterMultipliers: [],
        },
        [
            {
                tierFee: "1000",
                multiplier: "5",
                tierCapacity: "5",
            },
            {
                tierFee: "250",
                multiplier: "4",
                tierCapacity: "10",
            },
            {
                tierFee: "250",
                multiplier: "3",
                tierCapacity: "10",
            },
            {
                tierFee: "250",
                multiplier: "2",
                tierCapacity: "10",
            },
            {
                tierFee: "250",
                multiplier: "1",
                tierCapacity: "10",
            },
        ],
        {
            lockRate: "5000",
            duration: "1",
            cycleLimit: "32",
            target: "1250000000000000000",
        },
        [
            {
                id: "0",
                salePrice: "50000000000000000",
                saleAmount: "4",
                communityAmount: "1",
                reservedAmount: "0",
                communityVoucher: "0xbCe3781ae7Ca1a5e050Bd9C4c77369867eBc307e",
            },
            {
                id: "1",
                salePrice: "40000000000000000",
                saleAmount: "9",
                communityAmount: "0",
                reservedAmount: "1",
                communityVoucher: "0x0000000000000000000000000000000000000000",
            },
            {
                id: "2",
                salePrice: "30000000000000000",
                saleAmount: "10",
                communityAmount: "0",
                reservedAmount: "0",
                communityVoucher: "0x0000000000000000000000000000000000000000",
            },
            {
                id: "3",
                salePrice: "20000000000000000",
                saleAmount: "10",
                communityAmount: "0",
                reservedAmount: "0",
                communityVoucher: "0x0000000000000000000000000000000000000000",
            },
            {
                id: "4",
                salePrice: "10000000000000000",
                saleAmount: "10",
                communityAmount: "0",
                reservedAmount: "0",
                communityVoucher: "0x0000000000000000000000000000000000000000",
            },
        ],
        [
            {
                beneficiary: "0x33aaE4F4bA8019704137703Fe808F6B172D72D6B",
                percent: "10000",
            },
        ],
    ],
];

async function contribute() {
    const terminal = await hre.ethers.getContractAt("Terminal", terminalAddress);
    const rs = await terminal.contribute(4, [2], [2], "fix!", {
        value: 1.01 * (8 * Math.pow(10, 13) + 5 * Math.pow(10, 12)),
    });
    await rs.wait();
}

async function createProof() {}

async function createCustomProof() {}

function encodeParameters(types, values) {
    const abi = new hre.ethers.utils.AbiCoder();
    return abi.encode(types, values);
}

async function propose() {
    const daoGovernorBooster = await hre.ethers.getContractAt(
        "DAOGovernorBooster",
        daoGovernorBoosterAddress,
    );
    const x = encodeParameters(["uint256", "uint256", "uint256"], [2, 2, "1000000000"]);
    console.log("🚀 ~ file: createDao.js ~ line 268 ~ propose ~ x", x);

    const rs = await daoGovernorBooster.propose(
        2,
        {
            ipfsHash: "QmUDnjrbZjgfBhk6xp3qWijZVfsohswJ5PtHGZqLw3oXrw",
            start: "1657360176",
            end: "1657960176",
        },
        terminalAddress,
        "0",
        "unLockTreasury(uint256,uint256,uint256)",
        encodeParameters(["uint256", "uint256", "uint256"], [2, 2, "1000000000"]),
        {
            value: 1 * Math.pow(10, 15),
        },
    );
    const receipt = await rs.wait();
    console.log("🚀 ~ file: createDao.js ~ line 283 ~ propose ~ receipt", receipt);
}

async function create() {
    const terminal = await hre.ethers.getContractAt("Terminal", terminalAddress);
    const rs = await terminal.createDao(...config[3]);
    await rs.wait();
}

async function main() {
    propose();
}

main();
