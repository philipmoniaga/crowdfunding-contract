const owner = "0xc45D314D16957f8C72aB4cA27A619bd0042A00c6";

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
    const { deploy } = deployments;
    const namedAccounts = await getNamedAccounts();
    const { deployer } = namedAccounts;
    await deploy("Projects", {
        from: deployer,
        args: [owner],
        log: true,
    });
    const projectAddress = (await deployments.get("Projects")).address;

    await deploy("TerminalDirectory", {
        from: deployer,
        args: [projectAddress],
        log: true,
    });
};

module.exports.tags = ["Directory"];
