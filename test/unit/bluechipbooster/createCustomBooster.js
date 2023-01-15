import { ethers } from "hardhat";
import { expect } from "chai";

const tests = {
    success: [
        {
            description: "create custom booster",
            fn: ({ deployer, addrs, bluechip2 }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                bluechips: [bluechip2.address],
                multipliers: [2],
            }),
        },
    ],
    failure: [
        {
            description: "failed create custom booster, registered",
            fn: ({ deployer, addrs, bluechip1 }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                bluechips: [bluechip1.address],
                multipliers: [2],
                revert: "BoosterRegisterd()",
            }),
        },
        {
            description: "failed create custom booster, zero address",
            fn: ({ deployer, addrs, bluechip2 }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                bluechips: [ethers.constants.AddressZero],
                multipliers: [2],
                revert: "ZeroAddress()",
            }),
        },
        {
            description: "failed create custom booster, size different",
            fn: ({ deployer, addrs, bluechip2 }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                bluechips: [ethers.constants.AddressZero],
                multipliers: [2, 3],
                revert: "SizeNotMatch()",
            }),
        },
        {
            description: "failed create custom booster, bad multiplier",
            fn: ({ deployer, addrs, bluechip2 }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                bluechips: [bluechip2.address],
                multipliers: [0],
                revert: "BadMultiper()",
            }),
        },
    ],
};

export default function () {
    describe("Success cases", function () {
        tests.success.forEach(function (successTest) {
            it(successTest.description, async function () {
                const { caller, owner, projectId, bluechips, multipliers } = await successTest.fn(
                    this,
                );
                await this.terminalDirectory.mock.terminalOf
                    .withArgs(projectId)
                    .returns(caller.address);
                // Execute the transaction.
                const tx = await this.contract
                    .connect(caller)
                    .createCustomBooster(projectId, bluechips, multipliers);
            });
        });
    });

    describe("Failure cases", function () {
        tests.failure.forEach(function (failureTest) {
            it(failureTest.description, async function () {
                const { caller, owner, projectId, bluechips, multipliers, revert } =
                    await failureTest.fn(this);
                await this.terminalDirectory.mock.terminalOf
                    .withArgs(projectId)
                    .returns(caller.address);
                if (revert == "BoosterRegisterd()") {
                    this.contract
                        .connect(caller)
                        .createCustomBooster(projectId, bluechips, multipliers);
                }
                await expect(
                    this.contract
                        .connect(caller)
                        .createCustomBooster(projectId, bluechips, multipliers),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
