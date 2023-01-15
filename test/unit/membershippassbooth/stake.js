import hardhat from "hardhat";
const {
    ethers: { BigNumber, constants },
} = hardhat;
import { expect } from "chai";

const tests = {
    success: [
        {
            description: "stake and get user allocation",
            fn: ({ deployer, randomAddressFn, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                fundingCycleId: 1,
                tierFee: [1],
                tierCapacity: [10],
                multipliers: [10],
                uri: "erc 1155",
                contracturi: "contract uri",
                users: [addrs[0].address, addrs[2].address, addrs[1].address],
                payInfo: [
                    [
                        {
                            tier: 1,
                            amount: 1,
                            weight: 25,
                        },
                    ],
                    [
                        {
                            tier: 1,
                            amount: 20,
                            weight: 25,
                        },
                    ],
                    [
                        {
                            tier: 1,
                            amount: 100,
                            weight: 25,
                        },
                    ],
                ],
                expected: {
                    allocations: [
                        BigNumber.from(64935),
                        BigNumber.from(285714),
                        BigNumber.from(649350),
                    ],
                },
            }),
        },
    ],
    failure: [],
};

export default function () {
    describe("Success cases", function () {
        tests.success.forEach(function (successTest) {
            it(successTest.description, async function () {
                const {
                    caller,
                    users,
                    projectId,
                    fundingCycleId,
                    payInfo,
                    owner,
                    tierFee,
                    tierCapacity,
                    multipliers,
                    expected,
                } = await successTest.fn(this);
                await this.terminalDirectory.mock.terminalOf.withArgs(projectId).returns(owner);
                // Execute the transaction.
                const tx = await this.contract
                    .connect(caller)
                    .issue(projectId, tierFee, tierCapacity, multipliers);

                for (let i = 0; i < users.length; i++) {
                    await this.contract
                        .connect(caller)
                        .stake(projectId, fundingCycleId, users[i], payInfo[i]);
                }

                for (let i = 0; i < users.length; i++) {
                    this.contract
                        .connect(caller)
                        .getUserAllocation(users[i], projectId, fundingCycleId)
                        .then((res, err) => {
                            expect(res[0]).to.equal(expected.allocations[i]);
                        });
                }
            });
        });
    });

    describe("Failure cases", function () {
        tests.failure.forEach(function (failureTest) {
            it(failureTest.description, async function () {});
        });
    });
}
