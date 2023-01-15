import { ethers } from "hardhat";
import { expect } from "chai";

const tests = {
    success: [
        {
            description: "airdrop batch mint erc1155",
            fn: ({ deployer }) => ({
                caller: deployer,
                projectId: 1,
                fundingCycleId: 1,
                uri: "erc 1155",
                contracturi: "contract uri",
                owner: deployer.address,
                tiersId: [1, 2, 3],
                amounts: [10, 10, 10],
                expectation: {
                    remaining: 19,
                },
            }),
        },
    ],
    failure: [
        {
            description: "Failure Tier Fee too low",
            fn: ({ deployer }) => ({
                caller: deployer,
                projectId: 1,
                uri: "erc 1155",
                contracturi: "contract uri",
                owner: deployer.address,
                tiersId: [0, 0, 0],
                amounts: [0, 0, 0],
                revert: "BadCapacity()",
            }),
        },
        {
            description: "Failure Tier Capacity too low",
            fn: ({ deployer }) => ({
                caller: deployer,
                projectId: 1,
                uri: "erc 1155",
                contracturi: "contract uri",
                owner: deployer.address,
                tiersId: [11, 21, 31],
                amounts: [11, 11, 11],
                revert: "BadFee()",
            }),
        },
    ],
};

export default function () {
    describe("Success cases", function () {
        tests.success.forEach(function (successTest) {
            it(successTest.description, async function () {
                const { caller, owner, projectId, tiersId, amounts, expectation, fundingCycleId } =
                    await successTest.fn(this);
                await this.terminalDirectory.mock.terminalOf.withArgs(projectId).returns(owner);
                // Execute the transaction.

                const tx = await this.contract
                    .connect(caller)
                    .airdropBatchMintTicket(projectId, fundingCycleId, owner, tiersId, amounts);

                // Expect an event to have been emitted.
                expect(tx)
                    .to.emit(this.contract, "AirdropBatchMintTicket")
                    .withArgs(projectId, this.contract._membershipPass, tiersId, amounts);
            });
        });
    });

    describe("Failure cases", function () {
        tests.failure.forEach(function (failureTest) {
            it(failureTest.description, async function () {
                const { caller, owner, projectId, tiersId, amounts, revert } = await failureTest.fn(
                    this,
                );
                await this.terminalDirectory.mock.terminalOf.withArgs(projectId).returns(owner);
                // Execute the transaction.
                await expect(
                    this.contract
                        .connect(caller)
                        .airdropBatchMintTicket(projectId, tiersId, amounts),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
