import { ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";

const tests = {
    success: [
        {
            description: "success contribute dao",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                memo: "memo",
                amount: 10000,
                paydata: [10, 10],
                tiers: [1, 1],
                amounts: [10, 10],
                payweight: [
                    { tier: 1, amount: 10, weight: 100 },
                    { tier: 1, amount: 10, weight: 100 },
                ],
                weight: BigNumber.from(100),
                salePrice: BigNumber.from(10),
                totalAmount: 200,
                expectation: {
                    projectId: 1,
                },
            }),
        },
    ],
    failure: [
        {
            description: "failed amount contribute dao",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                memo: "memo",
                amount: 10,
                fundingCycleId: 1,
                fundingCyclePaused: false,
                paydata: [10, 10],
                tiers: [1, 1],
                amounts: [10, 10],
                payweight: [
                    { tier: 1, amount: 10, weight: 100 },
                    { tier: 1, amount: 10, weight: 100 },
                ],
                weight: BigNumber.from(100),
                salePrice: BigNumber.from(10),
                totalAmount: 200,
                revert: "InsufficientBalance()",
            }),
        },
        {
            description: "fundingcycle not exist contribute dao",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                handle: ethers.utils.formatBytes32String("some-handle"),
                projectId: 1,
                memo: "memo",
                amount: 10,
                fundingCycleId: 0,
                fundingCyclePaused: false,
                paydata: [10, 10],
                tiers: [1, 1],
                amounts: [10, 10],
                payweight: [
                    { tier: 1, amount: 10, weight: 100 },
                    { tier: 1, amount: 10, weight: 100 },
                ],
                weight: BigNumber.from(100),
                salePrice: BigNumber.from(10),
                totalAmount: 200,
                revert: "FundingCycleNotExist()",
            }),
        },
        {
            description: "fundingcycle not exist contribute dao",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                handle: ethers.utils.formatBytes32String("some-handle"),
                projectId: 1,
                memo: "memo",
                amount: 10,
                fundingCycleId: 1,
                fundingCyclePaused: true,
                paydata: [10, 10],
                tiers: [1, 1],
                amounts: [10, 10],
                payweight: [
                    { tier: 1, amount: 10, weight: 100 },
                    { tier: 1, amount: 10, weight: 100 },
                ],
                weight: BigNumber.from(100),
                salePrice: BigNumber.from(10),
                totalAmount: 200,
                revert: "FundingCyclePaused()",
            }),
        },
    ],
};

const ACTIVE = 1;
export default function () {
    describe("Success cases", function () {
        tests.success.forEach(function (successTest) {
            it(successTest.description, async function () {
                const {
                    caller,
                    owner,
                    projectId,
                    memo,
                    paydata,
                    amount,
                    payweight,
                    weight,
                    salePrice,
                    totalAmount,
                    tiers,
                    amounts,
                } = await successTest.fn(this);
                const fundingCycleId = 1;
                await this.fundingcycles.mock.getFundingCycleState
                    .withArgs(fundingCycleId)
                    .returns(ACTIVE);
                await this.fundingcycles.mock.currentOf.withArgs(projectId).returns({
                    id: fundingCycleId,
                    projectId: projectId,
                    previousId: 0,
                    start: 0,
                    target: 0,
                    lockRate: 50,
                    duration: 10,
                    isPaused: false,
                    cycleLimit: 30,
                });

                for (let i = 0; i < paydata.length; i += 1) {
                    await this.fundingcycles.mock.getAutionedPass
                        .withArgs(fundingCycleId, i)
                        .returns({
                            id: i,
                            weight: weight,
                            salePrice: salePrice,
                            saleAmount: BigNumber.from(100),
                            communityAmount: BigNumber.from(10),
                            communityVoucher: ethers.constants.AddressZero,
                            reservedAmount: BigNumber.from(0),
                        });
                }

                await this.fundingcycles.mock.updateLocked
                    .withArgs(projectId, fundingCycleId, totalAmount)
                    .returns();

                await this.membershippassbooth.mock.stake
                    .withArgs(projectId, fundingCycleId, owner, payweight)
                    .returns();

                const tx = await this.terminalImpl
                    .connect(caller)
                    .contribute(projectId, tiers, amounts, memo, { value: amount });
                expect(tx)
                    .to.emit(this.terminalImpl, "Pay")
                    .withArgs(projectId, fundingCycleId, owner, totalAmount, tiers, amounts, memo);
            });
        });
    });
    describe("Failure cases", function () {
        tests.failure.forEach(function (failureTest) {
            it(failureTest.description, async function () {
                const {
                    caller,
                    owner,
                    handle,
                    projectId,
                    memo,
                    paydata,
                    amount,
                    payweight,
                    weight,
                    salePrice,
                    totalAmount,
                    revert,
                    fundingCycleId,
                    fundingCyclePaused,
                    tiers,
                    amounts,
                } = await failureTest.fn(this);

                await this.fundingcycles.mock.getFundingCycleState
                    .withArgs(fundingCycleId)
                    .returns(ACTIVE);
                await this.fundingcycles.mock.currentOf.withArgs(projectId).returns({
                    id: fundingCycleId,
                    projectId: projectId,
                    previousId: 0,
                    start: 0,
                    target: 0,
                    lockRate: 50,
                    deposited: 100,
                    tappable: 50,
                    locked: 10,
                    unLocked: 20,
                    reachMaxLock: false,
                    duration: 10,
                    isPaused: fundingCyclePaused,
                    cycleLimit: 30,
                });

                for (let i = 0; i < paydata.length; i += 1) {
                    await this.fundingcycles.mock.getAutionedPass
                        .withArgs(fundingCycleId, i)
                        .returns({
                            id: i,
                            weight: weight,
                            salePrice: salePrice,
                            saleAmount: BigNumber.from(100),
                            communityAmount: BigNumber.from(10),
                            communityVoucher: ethers.constants.AddressZero,
                            reservedAmount: BigNumber.from(0),
                        });
                }
                await this.fundingcycles.mock.updateLocked
                    .withArgs(projectId, fundingCycleId, totalAmount)
                    .returns();
                await this.membershippassbooth.mock.stake
                    .withArgs(projectId, fundingCycleId, owner, payweight)
                    .returns();

                // Execute the transaction.
                await expect(
                    this.terminalImpl
                        .connect(caller)
                        .contribute(projectId, tiers, amounts, memo, { value: amount }),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
