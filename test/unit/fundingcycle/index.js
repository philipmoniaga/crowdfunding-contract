import configure from "./configure";

const contractName = "FundingCycles";

export default function () {
    // Before the tests, deploy mocked dependencies and the contract.
    before(async function () {
        // Deploy the contract.
        this.terminalDirectory = await this.deployMockLocalContractFn("TerminalDirectory");
        this.contract = await this.deployContractFn(contractName, [this.terminalDirectory.address]);
    });

    // Test each function.
    describe("configure(...)", configure);
}
