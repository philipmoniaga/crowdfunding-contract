import create from "./create";
import set_handle from "./set_handle";

const contractName = "Projects";

export default function () {
    // Before the tests, deploy mocked dependencies and the contract.
    before(async function () {
        // Deploy the contract.
        this.terminal = await this.deployMockLocalContractFn("ITerminal");
        this.contract = await this.deployContractFn(contractName, [this.addrs[0].address]);
    });

    // Test each function.
    describe("create(...)", create);
    describe("set_handle(...)", set_handle);
}
