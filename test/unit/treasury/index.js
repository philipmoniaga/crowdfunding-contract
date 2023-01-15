import tap from "./tap";
import { Contract } from "ethers";

const contractName = "Treasury";

export default function () {
    // Before the tests, deploy mocked dependencies and the contract.
    before(async function () {
        // Deploy the contract.
        this.devTreasury = this.addrs[0].address;
        this.admin = this.addrs[1].address;

        this.contract = await this.deployContractFn(contractName, [this.admin]);
        this.contract.updateDevTreasury(this.devTreasury);
    });

    // Test each function.
    // describe("tap(...)", tap);
}
