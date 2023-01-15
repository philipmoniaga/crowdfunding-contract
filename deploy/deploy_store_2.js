const singerAddress = "0xc45D314D16957f8C72aB4cA27A619bd0042A00c6";

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const namedAccounts = await getNamedAccounts();
    const { deployer } = namedAccounts;
    const projectAddress = (await deployments.get("Projects")).address;
    const terminalDirectoryAddress = (await deployments.get("TerminalDirectory")).address;

    const baseURI = "https://api.neighborhood.money/rinkeby/metadata/membershipPass/";
    const baseContractURI = "https://api.neighborhood.money/rinkeby/metadata/contract/";

    await deploy("PayoutStore", {
        from: deployer,
        args: [projectAddress, terminalDirectoryAddress],
        log: true,
    });
    await deploy("ConfigStore", {
        from: deployer,
        args: [baseURI, baseContractURI, singerAddress],
        log: true,
    });
};

module.exports.tags = ["Store"];
module.exports.dependencies = ["Directory"];
