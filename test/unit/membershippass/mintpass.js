import { ethers } from "hardhat";
import { expect } from "chai";

const tests = {
    success: [
        {
            description: "normal mint 1 erc1155",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                amount: 1,
                tier: 1,
                expectation: {
                    remaining: 19,
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
                amount: 1,
                tier: 10,
                revert: "TierUnknow()",
            }),
        },
        {
            description: "balance insufficient",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                amount: 1000,
                tier: 1,
                revert: "InsufficientBalance()",
            }),
        },
    ],
};

export default function () {
    describe("Success cases", function () {
        tests.success.forEach(function (successTest) {
            it(successTest.description, async function () {
                const { caller, owner, amount, tier, expectation } = await successTest.fn(this);

                // Execute the transaction.
                const tx = await this.contract
                    .connect(caller)
                    .mintPassForMember(this.account, tier, amount);

                // Expect an event to have been emitted.
                expect(tx).to.emit(this.contract, "MintPass").withArgs(this.account, tier, amount);

                expect(await this.contract.getRemainingAmount(tier)).to.equal(
                    expectation.remaining,
                );
            });
        });
    });

    describe("Failure cases", function () {
        tests.failure.forEach(function (failureTest) {
            it(failureTest.description, async function () {
                const { caller, owner, amount, tier, revert } = await failureTest.fn(this);

                // Execute the transaction.
                await expect(
                    this.contract.connect(caller).mintPassForMember(this.account, tier, amount),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
