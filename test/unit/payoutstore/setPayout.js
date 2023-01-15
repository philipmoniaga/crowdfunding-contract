import { ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";

const tests = {
    success: [
        {
            description: "success set payout",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                fundingCycleId: 1,
                payoutMods: [
                    {
                        percent: BigNumber.from(10),
                        beneficiary: addrs[1].address,
                    },
                ],
            }),
        },
    ],
    failure: [
        {
            description: "failed set payout noop",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                fundingCycleId: 1,
                payoutMods: [],
                revert: "NoOp()",
            }),
        },
        {
            description: "failed set payout bad total percentage",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                fundingCycleId: 1,
                payoutMods: [
                    {
                        percent: BigNumber.from(10001),
                        beneficiary: addrs[1].address,
                    },
                ],
                revert: "BadTotalPercentage()",
            }),
        },
        {
            description: "failed set payout bad address",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                fundingCycleId: 1,
                payoutMods: [
                    {
                        percent: BigNumber.from(10000),
                        beneficiary: ethers.constants.AddressZero,
                    },
                ],
                revert: "BadAddress()",
            }),
        },
    ],
};

export default function () {
    describe("Success cases", function () {
        tests.success.forEach(function (successTest) {
            it(successTest.description, async function () {
                const {
                    caller,
                    owner,
                    handle,
                    projectId,
                    fundingCycleId,
                    payoutMods,
                    setup: { create } = {},
                } = await successTest.fn(this);
                await this.terminalDirectory.mock.terminalOf.withArgs(projectId).returns(owner);

                const tx = await this.contract
                    .connect(caller)
                    .setPayoutMods(projectId, fundingCycleId, payoutMods);

                // Expect an event to have been emitted.
                expect(tx)
                    .to.emit(this.contract, "SetPayoutMod")
                    .withArgs(projectId, fundingCycleId, [], caller.address);
            });
        });
    });
    describe("Failure cases", function () {
        tests.failure.forEach(function (failureTest) {
            it(failureTest.description, async function () {
                const { caller, owner, projectId, fundingCycleId, payoutMods, revert } =
                    failureTest.fn(this);

                await this.terminalDirectory.mock.terminalOf.withArgs(projectId).returns(owner);

                // Execute the transaction.
                await expect(
                    this.contract
                        .connect(caller)
                        .setPayoutMods(projectId, fundingCycleId, payoutMods),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
