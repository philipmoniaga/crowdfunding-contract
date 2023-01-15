import { ethers } from "hardhat";
import { expect } from "chai";

const tests = {
    success: [
        {
            description: "batch normal  erc1155",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                amount: 1,
                tiers: [0, 1, 2],
                amounts: [2, 2, 2],
                expectation: {
                    remainings: [18, 18, 18],
                },
            }),
        },
    ],
    failure: [
        {
            description: "tier not exist",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                tiers: [10, 2, 3],
                amounts: [2, 2, 2],
                revert: "TierUnknow()",
            }),
        },
        {
            description: "balance insufficient",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                tiers: [1, 2, 3],
                amounts: [200, 2, 2],
                revert: "InsufficientBalance()",
            }),
        },
    ],
};

export default function () {
    describe("Success cases", function () {
        tests.success.forEach(function (successTest) {
            it(successTest.description, async function () {
                const { caller, owner, amounts, tiers, expectation } = await successTest.fn(this);

                // Execute the transaction.
                const tx = await this.contract
                    .connect(caller)
                    .batchMintPassForMember(this.account, tiers, amounts);

                // Expect an event to have been emitted.
                expect(tx)
                    .to.emit(this.contract, "BatchMintPass")
                    .withArgs(this.account, tiers, amounts);

                for (let i = 0; i < expectation.remainings.length; i += 1) {
                    expect(await this.contract.getRemainingAmount(i)).to.equal(
                        expectation.remainings[i],
                    );
                }
                //
            });
        });
    });

    describe("Failure cases", function () {
        tests.failure.forEach(function (failureTest) {
            it(failureTest.description, async function () {
                const { caller, owner, amounts, tiers, revert } = await failureTest.fn(this);

                // Execute the transaction.
                await expect(
                    this.contract
                        .connect(caller)
                        .batchMintPassForMember(this.account, tiers, amounts),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
