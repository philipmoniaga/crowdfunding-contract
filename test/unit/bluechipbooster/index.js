import createCustomBooster from "./createCustomBooster";
import createProof from "./createProof";
import redeemProof from "./redeemProof";
import challengeProof from "./challengeProof";
import renewProof from "./renewProof";
import addBlueChip from "./addBlueChip";

const contractName = "BluechipsBooster";

export default function () {
    // Before the tests, deploy mocked dependencies and the contract.
    before(async function () {
        // Deploy the contract.
        this.bluechip1 = await this.deployMockLocalContractFn("MockERC721");
        this.bluechip2 = await this.deployMockLocalContractFn("MockERC721");
        this.terminalDirectory = await this.deployMockLocalContractFn("TerminalDirectory");
        this.superadmin = this.deployer.address;
        this.contract = await this.deployContractFn(contractName, [
            [this.bluechip1.address],
            [2],
            this.superadmin,
            this.terminalDirectory.address,
        ]);
    });

    // Test each function.
    describe("createCustomBooster(...)", createCustomBooster);
    describe("addBlueChip()", addBlueChip);
    describe("renewProof()", renewProof);
    describe("createProof(...)", createProof);
    describe("redeemProof(...)", redeemProof);
    describe("challengeProof(...)", challengeProof);
}
