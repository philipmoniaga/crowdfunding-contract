import { ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";

const tests = {
    success: [
        {
            description: "success create dao",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                // _metadata
                handle: ethers.utils.formatBytes32String("some-handle"),
                projectUri: "test",
                contractUri: "test",
                membershipPassUri: "test",

                tiers: [
                    {
                        tierFee: BigNumber.from(10),
                        tierCapacity: BigNumber.from(10),
                        multiplier: BigNumber.from(100),
                    },
                    {
                        tierFee: BigNumber.from(10),
                        tierCapacity: BigNumber.from(10),
                        multiplier: BigNumber.from(100),
                    },
                ],
                params: {
                    lockRate: BigNumber.from(3005),
                    duration: BigNumber.from(10),
                    cycleLimit: BigNumber.from(10),
                    target: BigNumber.from(100),
                },
                auctionedPass: [
                    {
                        id: 0,
                        salePrice: BigNumber.from(100),
                        weight: BigNumber.from(10),
                        saleAmount: BigNumber.from(100),
                        communityAmount: BigNumber.from(10),
                        reservedAmount: BigNumber.from(0),
                        communityVoucher: ethers.constants.AddressZero,
                    },
                    {
                        id: 0,
                        salePrice: BigNumber.from(100),
                        weight: BigNumber.from(1),
                        saleAmount: BigNumber.from(100),
                        communityAmount: BigNumber.from(10),
                        reservedAmount: BigNumber.from(0),
                        communityVoucher: ethers.constants.AddressZero,
                    },
                ],
                payoutMods: [
                    {
                        percent: 10,
                        beneficiary: deployer.address,
                        projectId: 1,
                        fundingCycleId: 1,
                    },
                ],
                terminal: ethers.constants.AddressZero,
                expectation: {
                    projectId: 1,
                },
            }),
        },
    ],
    failure: [
        {
            description: "failed create dao LastWeightMustBe1",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                handle: ethers.utils.formatBytes32String("some-handle"),
                projectUri: "test",
                contractUri: "test",
                membershipPassUri: "test",
                tiers: [
                    {
                        tierFee: BigNumber.from(10),
                        tierCapacity: BigNumber.from(10),
                        multiplier: BigNumber.from(100),
                    },
                    {
                        tierFee: BigNumber.from(10),
                        tierCapacity: BigNumber.from(10),
                        multiplier: BigNumber.from(100),
                    },
                ],
                params: {
                    lockRate: BigNumber.from(50),
                    duration: BigNumber.from(10),
                    cycleLimit: BigNumber.from(10),
                    target: BigNumber.from(100),
                },
                auctionedPass: [
                    {
                        id: 0,
                        salePrice: BigNumber.from(100),
                        weight: BigNumber.from(10),
                        saleAmount: BigNumber.from(100),
                        communityAmount: BigNumber.from(10),
                        reservedAmount: BigNumber.from(0),
                        communityVoucher: ethers.constants.AddressZero,
                    },
                    {
                        id: 0,
                        salePrice: BigNumber.from(100),
                        weight: BigNumber.from(11),
                        saleAmount: BigNumber.from(100),
                        communityAmount: BigNumber.from(10),
                        reservedAmount: BigNumber.from(0),
                        communityVoucher: ethers.constants.AddressZero,
                    },
                ],
                payoutMods: [
                    {
                        percent: 10,
                        beneficiary: deployer.address,
                        projectId: 1,
                        fundingCycleId: 1,
                    },
                ],
                terminal: ethers.constants.AddressZero,
                revert: "LastWeightMustBe1()",
            }),
        },
        {
            description: "failed create dao MultiplierNotMatch",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                handle: ethers.utils.formatBytes32String("some-handle"),
                projectUri: "test",
                contractUri: "test",
                membershipPassUri: "test",
                tiers: [
                    {
                        tierFee: BigNumber.from(10),
                        tierCapacity: BigNumber.from(10),
                        multiplier: BigNumber.from(100),
                    },
                    {
                        tierFee: BigNumber.from(10),
                        tierCapacity: BigNumber.from(10),
                        multiplier: BigNumber.from(100),
                    },
                ],
                params: {
                    lockRate: BigNumber.from(50),
                    duration: BigNumber.from(10),
                    cycleLimit: BigNumber.from(10),
                    target: BigNumber.from(100),
                },
                auctionedPass: [
                    {
                        id: 0,
                        salePrice: BigNumber.from(100),
                        weight: BigNumber.from(10),
                        saleAmount: BigNumber.from(100),
                        communityAmount: BigNumber.from(10),
                        reservedAmount: BigNumber.from(0),
                        communityVoucher: ethers.constants.AddressZero,
                    },
                    {
                        id: 0,
                        salePrice: BigNumber.from(123),
                        weight: BigNumber.from(1),
                        saleAmount: BigNumber.from(100),
                        communityAmount: BigNumber.from(10),
                        reservedAmount: BigNumber.from(0),
                        communityVoucher: ethers.constants.AddressZero,
                    },
                ],
                payoutMods: [
                    {
                        percent: 10,
                        beneficiary: deployer.address,
                        projectId: 1,
                        fundingCycleId: 1,
                    },
                ],
                terminal: ethers.constants.AddressZero,
                revert: "MultiplierNotMatch()",
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
                    projectUri,
                    contractUri,
                    membershipPassUri,
                    params,
                    auctionedPass,
                    tiers,
                    payoutMods,
                } = await successTest.fn(this);
                const projectId = 1;
                await this.projects.mock.create
                    .withArgs(owner, handle, this.terminalImpl.address)
                    .returns(projectId);
                const membershipAddress = this.randomAddressFn();
                const tiersCapacity = tiers.map((el) => el.tierCapacity);
                const tiersFee = tiers.map((el) => el.tierFee);
                await this.membershippassbooth.mock.issue
                    .withArgs(projectId, tiersFee, tiersCapacity)
                    .returns(membershipAddress);

                await this.daogovernerboost.mock.createGovernor
                    .withArgs(projectId, membershipAddress, this.superadmin)
                    .returns();
                await this.fundingcycles.mock.configure
                    .withArgs(
                        projectId,
                        params.duration,
                        params.cycleLimit,
                        params.target,
                        params.lockRate,
                        auctionedPass,
                    )
                    .returns({
                        id: 1,
                        projectId: projectId,
                        start: 0,
                        duration: params.duration,
                        cycleLimit: params.cycleLimit,
                        isPaused: false,
                        previousId: 0,
                        target: params.target,
                        lockRate: params.lockRate,
                        deposited: 0,
                        tappable: 0,
                        locked: 0,
                        unLocked: 0,
                        reachMaxLock: false,
                    });
                await this.payoutStore.mock.setPayoutMods
                    .withArgs(projectId, 1, payoutMods)
                    .returns();
                await this.terminalImpl.connect(caller).createDao(
                    {
                        handle: handle,
                        projectURI: projectUri,
                        contractURI: contractUri,
                        membershipPassURI: membershipPassUri,
                        customBoosters: [],
                        boosterMultipliers: [],
                    },
                    tiers,
                    params,
                    auctionedPass,
                    payoutMods,
                );
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
                    projectUri,
                    contractUri,
                    membershipPassUri,
                    params,
                    auctionedPass,
                    tiers,
                    payoutMods,
                    revert,
                } = await failureTest.fn(this);
                const projectId = 1;

                await this.projects.mock.create
                    .withArgs(owner, handle, this.terminalImpl.address)
                    .returns(projectId);
                const membershipAddress = this.randomAddressFn();
                const tiersCapacity = tiers.map((el) => el.tierCapacity);
                const tiersFee = tiers.map((el) => el.tierFee);
                await this.membershippassbooth.mock.issue
                    .withArgs(projectId, tiersFee, tiersCapacity)
                    .returns(membershipAddress);

                await this.daogovernerboost.mock.createGovernor
                    .withArgs(projectId, membershipAddress, this.superadmin)
                    .returns();
                await this.fundingcycles.mock.configure
                    .withArgs(
                        projectId,
                        params.duration,
                        params.cycleLimit,
                        params.target,
                        params.lockRate,
                        auctionedPass,
                    )
                    .returns({
                        id: 1,
                        projectId: projectId,
                        start: 0,
                        duration: params.duration,
                        cycleLimit: params.cycleLimit,
                        isPaused: false,
                        previousId: 0,
                        target: params.target,
                        lockRate: params.lockRate,
                        deposited: 0,
                        tappable: 0,
                        locked: 0,
                        unLocked: 0,
                        reachMaxLock: false,
                    });
                await this.payoutStore.mock.setPayoutMods
                    .withArgs(projectId, 1, payoutMods)
                    .returns();
                // Execute the transaction.
                await expect(
                    this.terminalImpl.connect(caller).createDao(
                        {
                            handle: handle,
                            projectURI: projectUri,
                            contractURI: contractUri,
                            membershipPassURI: membershipPassUri,
                            customBoosters: [],
                            boosterMultipliers: [],
                        },
                        tiers,
                        params,
                        auctionedPass,
                        payoutMods,
                    ),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
