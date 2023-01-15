import create from "./create";
import propose from "./propose";

const contractName = "DAOGovernorBooster";

export default function () {
    // Before the tests, deploy mocked dependencies and the contract.
    before(async function () {
        // Deploy the contract.
        this.terminalDirectory = await this.deployMockLocalContractFn("TerminalDirectory");
        this.projects = await this.deployMockLocalContractFn("Projects");
        this.signer = this.randomAddressFn();
        this.contract = await this.deployContractFn(contractName, [
            this.projects.address,
            this.signer,
            this.terminalDirectory.address,
        ]);
    });

    // Test each function.
    describe("create(...)", create);
    describe("propose(...)", propose);
}
