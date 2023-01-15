import { ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";

const tests = {
    success: [
        {
            description: "success community contribute dao",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                fundingCycleId: BigNumber.from(1),
                projectId: BigNumber.from(1),
                allocations: [BigNumber.from(2), BigNumber.from(2)],
                refundAmount: BigNumber.from(20000),
                amounts: [BigNumber.from(0), BigNumber.from(0)],
                salePrice: BigNumber.from(10),
                depositedAmounts: BigNumber.from(100),
            }),
        },
    ],
    failure: [
        {
            description: "failed community contribute dao: all already claimed",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                fundingCycleId: BigNumber.from(1),
                projectId: BigNumber.from(1),
                allocations: [BigNumber.from(2), BigNumber.from(2)],
                refundAmount: BigNumber.from(20000),
                amounts: [BigNumber.from(0), BigNumber.from(0)],
                salePrice: BigNumber.from(10),
                depositedAmounts: BigNumber.from(100),
                revert: "AlreadyClaimed()",
                alreadyClaimed: true,
                fixtureBalance: 100000,
            }),
        },
        {
            description: "failed community contribute dao: project no balance",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                fundingCycleId: BigNumber.from(1),
                projectId: BigNumber.from(1),
                allocations: [BigNumber.from(2), BigNumber.from(2)],
                refundAmount: BigNumber.from(20000),
                amounts: [BigNumber.from(0), BigNumber.from(0)],
                salePrice: BigNumber.from(10),
                depositedAmounts: BigNumber.from(100),
                revert: "InsufficientBalance()",
                alreadyClaimed: false,
                fixtureBalance: 0,
            }),
        },
    ],
};

const EXPIRED = 2;

export default function () {
    describe("Success cases", function () {
        tests.success.forEach(function (successTest) {
            it(successTest.description, async function () {
                const {
                    caller,
                    owner,
                    fundingCycleId,
                    projectId,
                    allocations,
                    salePrice,
                    amounts,
                    refundAmount,
                    depositedAmounts,
                } = await successTest.fn(this);
                await this.membershippassbooth.mock.getUserAllocation
                    .withArgs(owner, projectId, fundingCycleId)
                    .returns(allocations);
                await this.membershippassbooth.mock.claimedOf
                    .withArgs(owner, fundingCycleId)
                    .returns(false);
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
                    .returns(EXPIRED);
                for (let i = 0; i < allocations.length; i += 1) {
                    await this.membershippassbooth.mock.depositedWeightBy
                        .withArgs(owner, fundingCycleId, i)
                        .returns(depositedAmounts, 0);
                    await this.fundingcycles.mock.getAutionedPass
                        .withArgs(fundingCycleId, i)
                        .returns({
                            id: i,
                            weight: BigNumber.from(100),
                            saleAmount: BigNumber.from(100),
                            salePrice: salePrice,
                            communityAmount: BigNumber.from(100),
                            communityVoucher: ethers.constants.AddressZero,
                            reservedAmount: BigNumber.from(0),
                        });
                }

                await this.membershippassbooth.mock.batchMintTicket
                    .withArgs(projectId, fundingCycleId, owner, amounts)
                    .returns();

                await this.terminalImpl.connect(caller).addToBalance(projectId, { value: 100000 });
                const tx = await this.terminalImpl
                    .connect(caller)
                    .claimPassOrRefund(projectId, fundingCycleId);
                expect(tx)
                    .to.emit(this.terminalImpl, "Claim")
                    .withArgs(projectId, fundingCycleId, owner, refundAmount, amounts);
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
                    allocations,
                    salePrice,
                    amounts,
                    revert,
                    depositedAmounts,
                    fixtureBalance,
                    alreadyClaimed,
                } = await failureTest.fn(this);
                await this.membershippassbooth.mock.getUserAllocation
                    .withArgs(owner, projectId, fundingCycleId)
                    .returns(allocations);
                await this.membershippassbooth.mock.claimedOf
                    .withArgs(owner, fundingCycleId)
                    .returns(alreadyClaimed);
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
                    .returns(EXPIRED);
                for (let i = 0; i < allocations.length; i += 1) {
                    await this.membershippassbooth.mock.depositedWeightBy
                        .withArgs(owner, fundingCycleId, i)
                        .returns(depositedAmounts, 0);
                    await this.fundingcycles.mock.getAutionedPass
                        .withArgs(fundingCycleId, i)
                        .returns({
                            id: i,
                            weight: BigNumber.from(100),
                            saleAmount: BigNumber.from(100),
                            salePrice: salePrice,
                            communityAmount: BigNumber.from(100),
                            communityVoucher: ethers.constants.AddressZero,
                            reservedAmount: BigNumber.from(0),
                        });
                }

                await this.membershippassbooth.mock.batchMintTicket
                    .withArgs(projectId, fundingCycleId, owner, amounts)
                    .returns();
                if (fixtureBalance != 0) {
                    await this.terminalImpl
                        .connect(caller)
                        .addToBalance(projectId, { value: fixtureBalance });
                }

                // Execute the transaction.
                await expect(
                    this.terminalImpl.connect(caller).claimPassOrRefund(projectId, fundingCycleId),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
