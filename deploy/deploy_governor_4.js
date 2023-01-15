
module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
    const { deploy } = deployments;
    const namedAccounts = await getNamedAccounts();
    const { deployer } = namedAccounts;
    const projectAddress = (await deployments.get("Projects")).address;
    const configStoreAddress = (await deployments.get("ConfigStore")).address;
    const terminalDirectoryAddress = (await deployments.get("TerminalDirectory")).address;

    await deploy("DAOGovernorBooster", {
        from: deployer,
        args: [projectAddress, configStoreAddress, terminalDirectoryAddress],
        log: true,
    });
};

module.exports.tags = ["Governor"];
module.exports.dependencies = ["Libraries"];
