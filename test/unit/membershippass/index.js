import { Contract } from "ethers";

import mintpass from "./mintpass";
import batchmintpass from "./batchmintpass";

const contractName = "MembershipPass";

export default function () {
    // Before the tests, deploy mocked dependencies and the contract.
    before(async function () {
        // Deploy the contract.
        this.devTreasury = this.addrs[0].address;
        this.admin = this.addrs[1].address;
        this.account = this.addrs[2].address;
        this.membershipbooth = await this.deployMockLocalContractFn("MembershipPassBooth");
        this.feeCollector = await this.deployMockLocalContractFn("RoyaltyDistributor");
        this.uriStore = await this.deployMockLocalContractFn("ConfigStore");
        this.contract = await this.deployContractFn(contractName, [
            1,
            this.feeCollector.address,
            [2, 3, 5],
            [20, 20, 20],
            this.uriStore.address,
        ]);
    });

    // Test each function.
    describe("mintpass(...)", mintpass);
    describe("batchmintpass(...)", batchmintpass);
}
