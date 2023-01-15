import hardhat from "hardhat";
const {
    ethers: { BigNumber, constants },
} = hardhat;
import { expect } from "chai";
import { exit } from "process";

const testTemplate =
    ({ op = {}, setup = {}, preconfigure = {}, fastforward, ops = [], expectation = {}, revert }) =>
    ({ deployer, ballot }) => ({
        caller: deployer,
        controller: deployer.address,
        projectId: 1,
        target: BigNumber.from(120),
        currency: BigNumber.from(1),
        duration: BigNumber.from(1),
        cycleLimit: BigNumber.from(0),
        lockRate: BigNumber.from(2),
        fee: BigNumber.from(42),
        auctionedpass: [
            {
                weight: BigNumber.from(10),
                salePrice: BigNumber.from(10),
                saleAmount: BigNumber.from(1),
                reservedAmount: BigNumber.from(1),
            },
        ],
        setup: {
            preconfigure: {
                projectId: 2,
                target: BigNumber.from(120),
                duration: BigNumber.from(1),
                cycleLimit: BigNumber.from(0),
                fee: BigNumber.from(42),
                ...preconfigure,
            },
            ops: [
                ...ops,
                ...(fastforward
                    ? [
                          {
                              type: "fastforward",
                              seconds: fastforward,
                          },
                      ]
                    : []),
            ],
            ...setup,
        },
        expectation,
        ...op,
        revert,
    });
const tests = {
    success: [
        {
            description: "first funding cycle",
            fn: testTemplate({
                setup: {
                    // no preconfiguration
                    preconfigure: null,
                },
                expectation: {
                    duringFundingCycle: false,
                    fundingCycleId: 1,
                    projectId: 1,
                    previousId: 0,
                },
            }),
        },
        {
            description:
                "funding cycle exist cannot create same project during first funding cycle",
            fn: testTemplate({
                preconfigure: {
                    projectId: 1,
                    // Preconfigure the duration.
                    duration: BigNumber.from(1),
                },

                // Fast forward to a time well within the preconfigured duration.
                fastforward: BigNumber.from(1000),
                expectation: {
                    configuredNumber: 2,
                    duringFundingCycle: true,
                    projectId: 1,
                    fundingCycleId: 1,
                    previousId: 0,
                },
            }),
        },
        {
            description: "create two funding cycle",
            fn: testTemplate({
                preconfigure: {
                    projectId: 2,
                    duration: BigNumber.from(1),
                },
                // Fast forward to a time well within the preconfigured duration.
                fastforward: BigNumber.from(86390 * 10),
                expectation: {
                    configuredNumber: 2,
                    duringFundingCycle: false,
                    projectId: 2,
                    fundingCycleId: 2,
                    previousId: 0,
                },
            }),
        },
        {
            description: "create two funding cycle",
            fn: testTemplate({
                preconfigure: {
                    projectId: 2,
                    duration: BigNumber.from(1),
                },
                // Fast forward to a time well within the preconfigured duration.
                fastforward: BigNumber.from(86390 * 10),
                expectation: {
                    configuredNumber: 2,
                    duringFundingCycle: false,
                    projectId: 2,
                    fundingCycleId: 2,
                    previousId: 0,
                },
            }),
        },
        {
            description:
                "create first funding cycle and create the next one after finish same project",
            fn: testTemplate({
                preconfigure: {
                    projectId: 1,
                    duration: BigNumber.from(1),
                },
                // Fast forward to a time well within the preconfigured duration.
                fastforward: BigNumber.from(86390 * 10),
                expectation: {
                    configuredNumber: 2,
                    duringFundingCycle: false,
                    projectId: 1,
                    fundingCycleId: 2,
                    previousId: 1,
                },
            }),
        },
    ],
    failure: [
        {
            description: "funding cycle limit is over 32",
            fn: testTemplate({
                op: {
                    cycleLimit: 33,
                },
                setup: {
                    // no preconfiguration
                    preconfigure: null,
                },
                revert: "BadCycleLimit()",
            }),
        },
        {
            description: "duration over max",
            fn: testTemplate({
                op: {
                    duration: BigNumber.from(2).pow(16).sub(1),
                },
                setup: {
                    // no preconfiguration
                    preconfigure: null,
                },
                revert: "BadDuration()",
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
                    projectId,
                    target,
                    duration,
                    cycleLimit,
                    fee,
                    lockRate,
                    auctionedpass,
                    fastforward,
                    setup: { preconfigure, ops = [] } = {},
                    expectation,
                } = successTest.fn(this);
                await this.terminalDirectory.mock.terminalOf
                    .withArgs(projectId)
                    .returns(caller.address);
                let startTime;
                if (preconfigure) {
                    await this.terminalDirectory.mock.terminalOf
                        .withArgs(preconfigure.projectId)
                        .returns(caller.address);
                    const firstTx = await this.contract.connect(caller).configure(
                        preconfigure.projectId,
                        {
                            duration: preconfigure.duration,
                            cycleLimit: preconfigure.cycleLimit,
                            lockRate: lockRate,
                            target: preconfigure.target,
                        },
                        [],
                    );
                    const now = await this.getTimestampFn(firstTx.blockNumber);
                    startTime = now;
                }
                const discountRatesToApply = [];
                const durationsToApply = [];

                // Do any other specified operations.
                for (let i = 0; i < ops.length; i += 1) {
                    const op = ops[i];
                    switch (op.type) {
                        case "configure": {
                            // eslint-disable-next-line no-await-in-loop
                            const optx = await this.contract.connect(caller).configure(
                                op.projectId,
                                {
                                    duration: op.duration,
                                    cycleLimit: op.cycleLimit,
                                    lockRate: lockRate,
                                    target: op.target,
                                },
                                [],
                            );
                            const now = await this.getTimestampFn(optx.blockNumber);
                            startTime = now;

                            break;
                        }
                        case "fastforward":
                            // Fast forward the clock if needed.
                            // Subtract 1 so that the next operations mined block is likely to fall on the intended timestamp.
                            // eslint-disable-next-line no-await-in-loop
                            await this.fastforwardFn(op.seconds.sub(1));
                            break;
                        default:
                            break;
                    }
                }

                // Execute the transaction.
                // exit()
                const configureTx = await this.contract.connect(caller).configure(
                    projectId,
                    {
                        duration: duration,
                        cycleLimit: cycleLimit,
                        target: target,
                        lockRate: lockRate,
                    },
                    [],
                );
                const configuredTime = await this.getTimestampFn(configureTx.blockNumber);

                // Get the current timestamp after the transaction

                if (expectation.duringFundingCycle == false) {
                    await expect(configureTx)
                        .to.emit(this.contract, "Configure")
                        .withArgs(
                            expectation.fundingCycleId,
                            projectId,
                            configuredTime,
                            caller.address,
                        );
                } else {
                    await expect(configureTx)
                        .to.emit(this.contract, "FundingCycleExist")
                        .withArgs(
                            expectation.fundingCycleId,
                            projectId,
                            configuredTime,
                            caller.address,
                        );
                }

                // Get the time when the configured funding cycle starts.
                // Expect an Init event if not configuring the same funding cycle again.
                if (expectation.initI && expectation.duringFundingCycle == false) {
                    await expect(configureTx)
                        .to.emit(this.contract, "Init")
                        .withArgs(
                            expectation.fundingCycleId,
                            projectId,
                            expectation.previousId,
                            expectedStart,
                        );
                }

                // Get a reference to the funding cycle that was stored.
                const storedFundingCycle = await this.contract.getFundingCycle(
                    expectation.fundingCycleId,
                );
                // Expect the stored values to match what's expected.
                expect(storedFundingCycle.id).to.equal(expectation.fundingCycleId);
                expect(storedFundingCycle.projectId).to.equal(projectId);
                expect(storedFundingCycle.previousId).to.equal(expectation.previousId);
                expect(storedFundingCycle.cycleLimit).to.equal(cycleLimit);
                expect(storedFundingCycle.duration).to.equal(duration);
                expect(storedFundingCycle.target).to.equal(target);
            });
        });
    });

    describe("Failure cases", function () {
        tests.failure.forEach(function (failureTest) {
            it(failureTest.description, async function () {
                const {
                    caller,
                    controller,
                    projectId,
                    target,
                    currency,
                    duration,
                    cycleLimit,
                    discountRate,
                    fee,
                    lockRate,
                    metadata,
                    configureActiveFundingCycle,
                    setup: { preconfigure } = {},
                    revert,
                } = failureTest.fn(this);

                // Mock the caller to be the project's controller for setup.
                await this.terminalDirectory.mock.terminalOf
                    .withArgs(projectId)
                    .returns(caller.address);
                if (preconfigure) {
                    await this.contract.connect(caller).configure(
                        preconfigure.projectId,
                        {
                            duration: preconfigure.duration,
                            cycleLimit: preconfigure.cycleLimit,
                            lockRate: lockRate,
                            target: preconfigure.target,
                        },
                        [],
                    );
                }

                // await this.terminalDirectory.mock.terminalOf.withArgs(projectId).returns(controller);

                await expect(
                    this.contract.connect(caller).configure(
                        projectId,
                        {
                            duration: duration,
                            cycleLimit: cycleLimit,
                            target: target,
                            lockRate: lockRate,
                        },
                        [],
                    ),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
