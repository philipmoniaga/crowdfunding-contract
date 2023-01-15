import { ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";

const tests = {
    success: [
        {
            description: "success tap",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                fundingCycleId: BigNumber.from(1),
                projectId: BigNumber.from(1),
                depositedAmounts: BigNumber.from(100),
            }),
        },
    ],
    failure: [
        {
            description: "failed tap: funding cycle not active",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                fundingCycleId: BigNumber.from(1),
                projectId: BigNumber.from(1),
                depositedAmounts: BigNumber.from(100),
                revert: "BadOperationPeriod()",
                fundingCycleState: EXPIRED,
            }),
        },
        {
            description: "failed tap: not enough balance",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                fundingCycleId: BigNumber.from(1),
                projectId: BigNumber.from(1),
                depositedAmounts: BigNumber.from(100000000),
                revert: "InsufficientBalance()",
                fundingCycleState: ACTIVE,
            }),
        },
    ],
};

const ACTIVE = 2;
const EXPIRED = 1;

export default function () {
    describe("Success cases", function () {
        tests.success.forEach(function (successTest) {
            it(successTest.description, async function () {
                const { caller, owner, fundingCycleId, projectId, depositedAmounts } =
                    await successTest.fn(this);

                await this.projects.mock.ownerOf.withArgs(projectId).returns(owner);
                await this.fundingcycles.mock.getFundingCycle.withArgs(fundingCycleId).returns({
                    id: fundingCycleId,
                    projectId: projectId,
                    previousId: BigNumber.from(0),
                    start: BigNumber.from(10),
                    target: BigNumber.from(10),
                    lockRate: BigNumber.from(40),
                    duration: BigNumber.from(10),
                    isPaused: false,
                    cycleLimit: BigNumber.from(4),
                });

                await this.fundingcycles.mock.getFundingCycleState
                    .withArgs(fundingCycleId)
                    .returns(ACTIVE);

                await this.terminalImpl.connect(caller).addToBalance(projectId, { value: 100000 });

                await this.fundingcycles.mock.tap
                    .withArgs(projectId, fundingCycleId, depositedAmounts)
                    .returns();
                await this.payoutStore.mock.payoutModsOf.withArgs(fundingCycleId).returns([
                    {
                        percent: 10,
                        beneficiary: owner,
                        projectId: projectId,
                        fundingCycleId: fundingCycleId,
                    },
                ]);
                const tx = await this.terminalImpl
                    .connect(caller)
                    .tap(projectId, fundingCycleId, depositedAmounts);
                const feeAmount = (depositedAmounts * 4) / 100;
                const tappableAmount = depositedAmounts - feeAmount;
                expect(tx)
                    .to.emit(this.terminalImpl, "Tap")
                    .withArgs(projectId, fundingCycleId, owner, feeAmount, tappableAmount);
            });
        });
    });
    describe("Failure cases", function () {
        tests.failure.forEach(function (failureTest) {
            it(failureTest.description, async function () {
                const {
                    caller,
                    owner,
                    fundingCycleId,
                    projectId,
                    depositedAmounts,
                    fundingCycleState,
                    revert,
                } = await failureTest.fn(this);

                await this.projects.mock.ownerOf.withArgs(projectId).returns(owner);
                await this.fundingcycles.mock.getFundingCycle.withArgs(fundingCycleId).returns({
                    id: fundingCycleId,
                    projectId: projectId,
                    previousId: BigNumber.from(0),
                    start: BigNumber.from(10),
                    target: BigNumber.from(10),
                    lockRate: BigNumber.from(40),
                    duration: BigNumber.from(10),
                    isPaused: false,
                    cycleLimit: BigNumber.from(4),
                });

                await this.fundingcycles.mock.getFundingCycleState
                    .withArgs(fundingCycleId)
                    .returns(fundingCycleState);

                await this.terminalImpl.connect(caller).addToBalance(projectId, { value: 100000 });

                await this.fundingcycles.mock.tap
                    .withArgs(projectId, fundingCycleId, depositedAmounts)
                    .returns();
                // Execute the transaction.
                await expect(
                    this.terminalImpl
                        .connect(caller)
                        .tap(projectId, fundingCycleId, depositedAmounts),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
