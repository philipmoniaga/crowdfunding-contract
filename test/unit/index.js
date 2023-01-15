import projects from "./projects";
import fundingcycle from "./fundingcycle";
import treasury from "./treasury";
import membershippass from "./membershippass";
import membershippassbooth from "./membershippassbooth";
import terminal from "./terminal";
import daogovernorbooster from "./daogovernorbooster";
import bluechipbooster from "./bluechipbooster";
import payoutstore from "./payoutstore";

let snapshotId;
export default function () {
    beforeEach(async function () {
        snapshotId = await this.snapshotFn();
        // Mark the start time of each test.
        await this.setTimeMarkFn();
    });
    // // // Test each contract.
    describe("Projects", projects);
    describe("FundingCycle", fundingcycle);
    describe("Treasury", treasury);
    describe("MembershipPass", membershippass);
    describe("MembershipPassBooth", membershippassbooth);
    describe("Terminal", terminal);
    describe("DAOGovernorBooster", daogovernorbooster);
    describe("BluechipsBooster", bluechipbooster);
    describe("PayoutStore", payoutstore);
    // // After each test, restore the contract state.
    afterEach(async function () {
        await this.restoreFn(snapshotId);
    });
}
