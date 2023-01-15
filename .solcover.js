module.exports = {
    skipFiles: [
        'interfaces/IBluechipsBooster.sol',
        'interfaces/IConfigStore.sol',
        'interfaces/IDAOGovernorBooster.sol',
        'interfaces/IFundingCycles.sol',
        'interfaces/IMembershipPass.sol',
        'interfaces/IMembershipPassBooth.sol',
        'interfaces/IPayoutStore.sol',
        'interfaces/IProjects.sol',
        'interfaces/IRoyalDistributor.sol',
        'interfaces/ITerminal.sol',
        'interfaces/ITerminalDirectory.sol',
        'interfaces/ITerminalUtility.sol',
        'mock/MockERC721.sol',
    ],
    configureYulOptimizer: true,
    measureStatementCoverage: false,
  };