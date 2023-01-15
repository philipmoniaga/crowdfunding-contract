const owner = "0xc45D314D16957f8C72aB4cA27A619bd0042A00c6";

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const namedAccounts = await getNamedAccounts();
    const { deployer } = namedAccounts;
    const terminalDirectoryAddress = (await deployments.get("TerminalDirectory")).address;
    const fundingCycles = await deploy("FundingCycles", {
        from: deployer,
        args: [terminalDirectoryAddress],
        log: true,
    });
    const configStoreAddress = (await deployments.get("ConfigStore")).address;
    await deploy("MembershipPassBooth", {
        from: deployer,
        args: [terminalDirectoryAddress, configStoreAddress, fundingCycles.address],
        log: true,
    });

    const mockedBluechips = [
        "0x277fc3471ab37F9D654f64876b020d960d93a765",
        "0x4aAbA49d75576c8F158F7502FBaB869948A6eB4D",
        "0x4AE21C50Fed572D3220f77D202a838b593f63160",
        "0x71F3BD12c0B964F53bD594D9477e0a2837E3b786",
        "0xC7B0933473fe1beE049608382EbaEBA030a8A7D0",
    ];
    const multipers = ["150", "150", "135", "120", "110"];

    await deploy("BluechipsBooster", {
        from: deployer,
        args: [mockedBluechips, multipers, owner, terminalDirectoryAddress],
        log: true,
    });
};
module.exports.tags = ["Libraries"];
module.exports.dependencies = ["Store"];
