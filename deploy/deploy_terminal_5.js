const { ethers, upgrades } = require("hardhat");

// @TODO
const devTreasury = "0xc45D314D16957f8C72aB4cA27A619bd0042A00c6";
const owner = "0xc45D314D16957f8C72aB4cA27A619bd0042A00c6";

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
    const libraries = [
        "Projects",
        "FundingCycles",
        "MembershipPassBooth",
        "DAOGovernorBooster",
        "TerminalDirectory",
        "BluechipsBooster",
        "PayoutStore",
    ];
    const libraryAddress = [];
    for (let i = 0; i < libraries.length; i++) {
        libraryAddress.push((await deployments.get(libraries[i])).address);
    }
    
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    await deploy("Terminal", {
        from: deployer,
        proxy: {
            proxyContract: "OpenZeppelinTransparentProxy",
            execute: {
                methodName: "initialize",
                args: [...libraryAddress, devTreasury, owner],
            },
        },
        log: true,
    });
};
module.exports.tags = ["Terminal"];
module.exports.dependencies = ["Governor"];
