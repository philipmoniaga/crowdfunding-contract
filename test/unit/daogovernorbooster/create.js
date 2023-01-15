import { ethers } from "hardhat";
import { expect } from "chai";

const tests = {
    success: [
        {
            description: "create dao governor",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                admin: deployer.address,
                projectId: 1,
                membershipPass: addrs[1].address,
                multipliers: [1, 2],
            }),
        },
    ],
    failure: [
        {
            description: "failed terminal directory not owner project",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                admin: deployer.address,
                projectId: 1,
                membershipPass: addrs[1].address,
                multipliers: [1, 2],
                terminalOwner: addrs[1].address,
                revert: "UnAuthorized()",
            }),
        },
    ],
};

export default function () {
    describe("Success cases", function () {
        tests.success.forEach(function (successTest) {
            it(successTest.description, async function () {
                const { caller, owner, projectId, membershipPass, multipliers, admin } =
                    await successTest.fn(this);
                await this.terminalDirectory.mock.terminalOf
                    .withArgs(projectId)
                    .returns(caller.address);
                // Execute the transaction.
                const tx = await this.contract
                    .connect(caller)
                    .createGovernor(projectId, multipliers, membershipPass, admin);

                // Expect an event to have been emitted.
                expect(tx)
                    .to.emit(this.contract, "CreateGovernor")
                    .withArgs(projectId, membershipPass, owner);
            });
        });
    });

    describe("Failure cases", function () {
        tests.failure.forEach(function (failureTest) {
            it(failureTest.description, async function () {
                const {
                    caller,
                    owner,
                    projectId,
                    membershipPass,
                    multipliers,
                    terminalOwner,
                    revert,
                    admin,
                } = await failureTest.fn(this);
                await this.terminalDirectory.mock.terminalOf
                    .withArgs(projectId)
                    .returns(terminalOwner);
                // Execute the transaction.
                await expect(
                    this.contract
                        .connect(caller)
                        .createGovernor(projectId, multipliers, membershipPass, admin),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
