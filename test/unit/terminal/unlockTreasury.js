import { ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";

const EXPIRED = 2;
const ACTIVE = 1;

const tests = {
    success: [],
    failure: [
        {
            description: "failed unlock treasury only governer",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                fundingCycleId: BigNumber.from(1),
                projectId: BigNumber.from(1),
                projectFundingCycleId: BigNumber.from(1),
                unlockAmount: BigNumber.from(100),
                fundingCycleStatus: EXPIRED,
                revert: "OnlyGovernor()",
            }),
        },
        {
            description: "failed unlock treasury project not same funding cycle",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                fundingCycleId: BigNumber.from(1),
                projectId: BigNumber.from(1),
                unlockAmount: BigNumber.from(100),
                projectFundingCycleId: BigNumber.from(2),
                fundingCycleStatus: EXPIRED,
                revert: "FundingCycleNotExist()",
            }),
        },
        {
            description: "failed unlock treasury funding cycle not expired",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                fundingCycleId: BigNumber.from(1),
                projectId: BigNumber.from(1),
                projectId: BigNumber.from(1),
                unlockAmount: BigNumber.from(100),
                projectFundingCycleId: BigNumber.from(1),
                fundingCycleStatus: ACTIVE,
                revert: "BadOperationPeriod()",
            }),
        },
    ],
};

export default function () {
    describe("Failure cases", function () {
        tests.failure.forEach(function (failureTest) {
            it(failureTest.description, async function () {
                const {
                    caller,
                    owner,
                    fundingCycleId,
                    projectId,
                    revert,
                    unlockAmount,
                    fundingCycleStatus,
                    projectFundingCycleId,
                } = await failureTest.fn(this);
                await this.fundingcycles.mock.getFundingCycle.withArgs(fundingCycleId).returns({
                    id: fundingCycleId,
                    projectId: projectFundingCycleId,
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
                    .returns(fundingCycleStatus);

                // Execute the transaction.
                await expect(
                    this.terminalImpl
                        .connect(caller)
                        .unLockTreasury(projectId, fundingCycleId, unlockAmount),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
