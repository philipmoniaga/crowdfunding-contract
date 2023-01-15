
import { waffle, ethers, upgrades } from "hardhat";

import createDao from "./createDao";

const contractName = "Terminal";

export default function () {
    // Before the tests, deploy mocked dependencies and the contract.
    before(async function () {
        // Deploy the contract.
        this.projects = await this.deployMockLocalContractFn("IProjects");
        this.fundingcycles = await this.deployMockLocalContractFn("IFundingCycles");
        this.membershippassbooth = await this.deployMockLocalContractFn("IMembershipPassBooth");
        this.daogovernerboost = await this.deployMockLocalContractFn("IDAOGovernorBooster");
        this.terminaldirectory = await this.deployMockLocalContractFn("ITerminalDirectory");
        const terminal = await ethers.getContractFactory(contractName);
        this.terminalImpl = await upgrades.deployProxy(terminal, [this.projects.address, this.fundingcycles.address, this.membershippassbooth.address, this.daogovernerboost.address, this.terminaldirectory.address, 
            this.addrs[1].address, this.addrs[2].address]);
        await this.terminalImpl.deployed()
    });

    // Test each function.
    describe("create(...)", createDao);
//     describe("set_handle(...)", set_handle);
}
