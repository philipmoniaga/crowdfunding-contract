import { ethers } from "hardhat";
import { expect } from "chai";

const tests = {
    success: [
        {
            description: "Test Issue normal function ",
            fn: ({ deployer }) => ({
                caller: deployer,
                projectId: 1,
                uri: "erc 1155",
                contracturi: "contract uri",
                owner: deployer.address,
                tierFee: [1, 2, 3],
                tierCapacity: [10, 10, 10],
                multipliers: [10, 10, 10],
                expectation: {
                    remaining: 19,
                },
            }),
        },
    ],
    failure: [
        {
            description: "Test Issue failure bad capacity",
            fn: ({ deployer }) => ({
                caller: deployer,
                projectId: 1,
                uri: "erc 1155",
                contracturi: "contract uri",
                owner: deployer.address,
                tierFee: [0, 0, 0],
                tierCapacity: [0, 0, 0],
                multipliers: [10, 10, 10],
                revert: "BadCapacity()",
            }),
        },
        {
            description: "Test Issue failure bad fee",
            fn: ({ deployer }) => ({
                caller: deployer,
                projectId: 1,
                uri: "erc 1155",
                contracturi: "contract uri",
                owner: deployer.address,
                tierFee: [1001, 21, 31],
                tierCapacity: [11, 11, 11],
                multipliers: [10, 10, 10],
                revert: "BadFee()",
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
                    projectId,
                    uri,
                    contracturi,
                    tierFee,
                    tierCapacity,
                    expectation,
                    multipliers
                } = await successTest.fn(this);
                await this.terminalDirectory.mock.terminalOf.withArgs(projectId).returns(owner);
                // Execute the transaction.
                const tx = await this.contract
                    .connect(caller)
                    .issue(projectId, tierFee, tierCapacity, multipliers);
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
                    uri,
                    contracturi,
                    tierFee,
                    tierCapacity,
                    revert,
                    multipliers
                } = await failureTest.fn(this);
                await this.terminalDirectory.mock.terminalOf.withArgs(projectId).returns(owner);
                // Execute the transaction.
                await expect(
                    this.contract.connect(caller).issue(projectId, tierFee, tierCapacity, multipliers),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
