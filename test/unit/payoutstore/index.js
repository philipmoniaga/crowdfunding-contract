import { Contract } from "ethers";

import setPayout from "./setPayout";

const contractName = "PayoutStore";

export default function () {
    // Before the tests, deploy mocked dependencies and the contract.
    before(async function () {
        // Deploy the contract.
        this.terminalDirectory = await this.deployMockLocalContractFn("TerminalDirectory");
        this.projects = await this.deployMockLocalContractFn("Projects");
        this.contract = await this.deployContractFn(contractName, [
            this.projects.address,
            this.terminalDirectory.address,
        ]);
    });

    // Test each function.
    describe("setPayout(...)", setPayout);
}
