import { Contract } from "ethers";

import issue from "./issue";
import airdrop from "./airdrop";
import stake from "./stake";

const contractName = "MembershipPassBooth";

export default function () {
    // Before the tests, deploy mocked dependencies and the contract.
    before(async function () {
        // Deploy the contract.
        this.uriStore = await this.deployMockLocalContractFn("ConfigStore");
        this.terminalDirectory = await this.deployMockLocalContractFn("TerminalDirectory");
        this.fundingCycle = await this.deployMockLocalContractFn("FundingCycles");
        this.contract = await this.deployContractFn(contractName, [
            this.terminalDirectory.address,
            this.uriStore.address,
            this.fundingCycle.address,
        ]);
    });

    // Test each function.
    describe("issue(...)", issue);
    // describe("airdrop(...)", airdrop);
    describe("stake(...)", stake);
}
