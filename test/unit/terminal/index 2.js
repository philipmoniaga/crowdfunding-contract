import { ethers, upgrades, network } from "hardhat";

import createDao from "./createDao";
import contribute from "./contribute";
import communityContribute from "./communityContribute";
import claimPassOrRefund from "./claimPassOrRefund";
import tap from "./tap";
import unlockTreasury from "./unlockTreasury";

const contractName = "Terminal";

export default function () {
    // Before the tests, deploy mocked dependencies and the contract.
    before(async function () {
        // Deploy the contract.
        this.mockcommunityvoucher = await this.deployMockLocalContractFn("MockERC721");
        this.projects = await this.deployMockLocalContractFn("IProjects");
        this.fundingcycles = await this.deployMockLocalContractFn("IFundingCycles");
        this.membershippassbooth = await this.deployMockLocalContractFn("IMembershipPassBooth");
        this.bluechipboost = await this.deployMockLocalContractFn("IBluechipsBooster");
        this.terminaldirectory = await this.deployMockLocalContractFn("ITerminalDirectory");
        this.payoutStore = await this.deployMockLocalContractFn("IPayoutStore");
        this.superadmin = this.addrs[2].address;
        this.signer = this.randomAddressFn();
        this.daogovernerboost = await this.deployMockLocalContractFn("IDAOGovernorBooster");
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [this.daogovernerboost.address],
        });
        const terminal = await ethers.getContractFactory(contractName);
        this.terminalImpl = await upgrades.deployProxy(terminal, [
            this.projects.address,
            this.fundingcycles.address,
            this.membershippassbooth.address,
            this.daogovernerboost.address,
            this.terminaldirectory.address,
            this.bluechipboost.address,
            this.payoutStore.address,
            this.addrs[1].address,
            this.superadmin,
        ]);
        await this.terminalImpl.deployed();
    });

    // Test each function.
    // describe("create(...)", createDao);
    // describe("contribute(...)", contribute);
    // describe("communityContribute(...)", communityContribute);
    // describe("claimPassOrRefund(...)", claimPassOrRefund);
    // describe("tap(...)", tap);
    describe("unlockTreasury(...)", unlockTreasury);
}
