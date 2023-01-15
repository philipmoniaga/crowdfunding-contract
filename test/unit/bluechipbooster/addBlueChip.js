
import { ethers } from "hardhat";
import { expect } from "chai";

const HOUR = ethers.BigNumber.from(3600);
const DAY = ethers.BigNumber.from(86400);
const WEEK = DAY.mul(7);
const MONTH = WEEK.mul(4);
const YEAR = MONTH.mul(12);

const tests = {
    success: [
        {
            description: "add blue chip",
            fn: ({ deployer, addrs, bluechip2 }) => ({
                caller: deployer,
                owner: deployer.address,
                bluechip: bluechip2.address,
                multiper: 2,
            }),
        },
    ],
    failure: [
        {
            description: "failed add blue chip, not admin",
            fn: ({ deployer, addrs, bluechip2 }) => ({
                caller: addrs[1],
                owner: deployer.address,
                bluechip: bluechip2.address,
                multiper: 2,
                revert: "NotAdmin()",
            }),
        },
        {
            description: "failed add blue chip, address bluechip zero",
            fn: ({ deployer, addrs, bluechip2 }) => ({
                caller: deployer,
                owner: deployer.address,
                bluechip: ethers.constants.AddressZero,
                multiper: 2,
                revert: "ZeroAddress()",
            }),
        },
        {
            description: "failed add blue chip, multiper already there",
            fn: ({ deployer, addrs, bluechip1 }) => ({
                caller: deployer,
                owner: deployer.address,
                bluechip: bluechip1.address,
                multiper: 2,
                revert: "ForbiddenUpdate()",
            }),
        }
    ],
};

export default function () {
    describe("Success cases", function () {
        tests.success.forEach(function (successTest) {
            it(successTest.description, async function () {
                const { caller, owner,multiper, bluechip } = await successTest.fn(this);
                // Execute the transaction.
                const tx = await this.contract
                    .connect(caller)
                    .addBlueChip(bluechip, multiper);

                expect(tx)
                    .to.emit(this.contract, "AddBluechip")
                    .withArgs(
                        bluechip,
                        multiper
                    );
            });
        });
    });

    describe("Failure cases", function () {
        tests.failure.forEach(function (failureTest) {
            it(failureTest.description, async function () {
                const { caller, multiper, revert, bluechip } =
                    await failureTest.fn(this);
   


                await expect(
                    this.contract
                        .connect(caller)
                        .addBlueChip(bluechip, multiper),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
