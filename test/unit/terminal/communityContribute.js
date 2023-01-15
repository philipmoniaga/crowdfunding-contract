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
                handle: ethers.utils.formatBytes32String("some-handle"),
                projectId: BigNumber.from(1),
                memo: "memo",
                tierSize: BigNumber.from(2),
                amounts: [BigNumber.from(1), BigNumber.from(1)],
                tiers: [BigNumber.from(0), BigNumber.from(1)],
                communityAmount: BigNumber.from(10),
            }),
        },
    ],
    failure: [
        {
            description: "failed community contribute dao, already claimed",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                fundingCycleId: BigNumber.from(1),
                handle: ethers.utils.formatBytes32String("some-handle"),
                projectId: BigNumber.from(1),
                memo: "memo",
                tierSize: BigNumber.from(2),
                amounts: [BigNumber.from(1), BigNumber.from(1)],
                tiers: [BigNumber.from(0), BigNumber.from(1)],
                communityAmount: BigNumber.from(10),
                revert: "AlreadyClaimed()",
                alreadyClaimed: true,
            }),
        },
        {
            description: "failed community contribute dao, no community ticket left",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                fundingCycleId: BigNumber.from(1),
                handle: ethers.utils.formatBytes32String("some-handle"),
                projectId: BigNumber.from(1),
                memo: "memo",
                tierSize: BigNumber.from(0),
                amounts: [BigNumber.from(1), BigNumber.from(1)],
                tiers: [BigNumber.from(0), BigNumber.from(1)],
                communityAmount: BigNumber.from(10),
                revert: "NoCommunityTicketLeft()",
                alreadyClaimed: false,
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
                    handle,
                    fundingCycleId,
                    projectId,
                    memo,
                    tiers,
                    amounts,
                    tierSize,
                    communityAmount,
                } = await successTest.fn(this);

                await this.membershippassbooth.mock.airdropClaimedOf
                    .withArgs(owner, fundingCycleId)
                    .returns(false);
                await this.membershippassbooth.mock.tierSizeOf
                    .withArgs(projectId)
                    .returns(tierSize);
                await this.mockcommunityvoucher.mock.balanceOf.withArgs(owner).returns(1);
                for (let i = 0; i < tierSize; i += 1) {
                    await this.membershippassbooth.mock.airdropClaimedAmountOf
                        .withArgs(fundingCycleId, i)
                        .returns(1);
                }
                for (let i = 0; i < tierSize; i += 1) {
                    await this.fundingcycles.mock.getAutionedPass
                        .withArgs(fundingCycleId, i)
                        .returns({
                            id: i,
                            weight: BigNumber.from(100),
                            salePrice: BigNumber.from(100),
                            saleAmount: BigNumber.from(100),
                            communityAmount: communityAmount,
                            communityVoucher: this.mockcommunityvoucher.address,
                            reservedAmount: BigNumber.from(0),
                        });
                }

                await this.membershippassbooth.mock.airdropBatchMintTicket
                    .withArgs(projectId, fundingCycleId, owner, tiers, amounts)
                    .returns();
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

                const tx = await this.terminalImpl
                    .connect(caller)
                    .communityContribute(projectId, fundingCycleId, memo);
                expect(tx)
                    .to.emit(this.terminalImpl, "Airdrop")
                    .withArgs(projectId, fundingCycleId, owner, tiers, amounts, memo);
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
                    fundingCycleId,
                    projectId,
                    memo,
                    tiers,
                    amounts,
                    tierSize,
                    communityAmount,
                    revert,
                    alreadyClaimed,
                } = await failureTest.fn(this);

                await this.membershippassbooth.mock.airdropClaimedOf
                    .withArgs(owner, fundingCycleId)
                    .returns(alreadyClaimed);
                await this.membershippassbooth.mock.tierSizeOf
                    .withArgs(projectId)
                    .returns(tierSize);
                await this.mockcommunityvoucher.mock.balanceOf.withArgs(owner).returns(1);
                for (let i = 0; i < tierSize; i += 1) {
                    await this.membershippassbooth.mock.airdropClaimedAmountOf
                        .withArgs(fundingCycleId, i)
                        .returns(1);
                }
                for (let i = 0; i < tierSize; i += 1) {
                    await this.fundingcycles.mock.getAutionedPass
                        .withArgs(fundingCycleId, i)
                        .returns({
                            id: i,
                            weight: BigNumber.from(100),
                            salePrice: BigNumber.from(100),
                            saleAmount: BigNumber.from(100),
                            communityAmount: communityAmount,
                            communityVoucher: this.mockcommunityvoucher.address,
                            reservedAmount: BigNumber.from(0),
                        });
                }

                await this.membershippassbooth.mock.airdropBatchMintTicket
                    .withArgs(projectId, fundingCycleId, owner, tiers, amounts)
                    .returns();
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

                // Execute the transaction.
                await expect(
                    this.terminalImpl
                        .connect(caller)
                        .communityContribute(projectId, fundingCycleId, memo),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
