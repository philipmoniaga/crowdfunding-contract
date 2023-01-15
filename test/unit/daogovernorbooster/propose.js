import { ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";

const HOUR = ethers.BigNumber.from(3600);
const DAY = ethers.BigNumber.from(86400);
const WEEK = DAY.mul(7);
const MONTH = WEEK.mul(4);
const YEAR = MONTH.mul(12);

const tests = {
    success: [
        {
            description: "propose dao governor",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                proposer: addrs[1].address,
                proposal: {
                    ipfsHash: ethers.utils.formatBytes32String("hash"),
                    start: 0,
                    end: MONTH,
                },
                target: addrs[2].address,
                value: 1,
                signature: "sig",
                calldata: ethers.utils.formatBytes32String("calldata"),
                amount: "10",
            }),
        },
    ],
    failure: [
        {
            description: "failed propose dao governor: bad period",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                proposer: addrs[1].address,
                proposal: {
                    ipfsHash: ethers.utils.formatBytes32String("hash"),
                    start: 0,
                    end: 0,
                },
                target: addrs[2].address,
                value: 1,
                signature: "",
                calldata: ethers.utils.formatBytes32String("calldata"),
                revert: "BadPeriod()",
                amount: "0",
            }),
        },
        {
            description: "failed propose dao governor: no balance",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                proposer: addrs[1].address,
                proposal: {
                    ipfsHash: ethers.utils.formatBytes32String("hash"),
                    start: 0,
                    end: MONTH,
                },
                target: addrs[2].address,
                value: 1,
                signature: "",
                calldata: ethers.utils.formatBytes32String("calldata"),
                revert: "InsufficientBalance()",
                amount: "0",
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
                    projectId,
                    proposal,
                    proposer,
                    target,
                    value,
                    signature,
                    calldata,
                    amount,
                } = await successTest.fn(this);
                const block = await ethers.provider.getBlock("latest");
                const startTimestamp = ethers.BigNumber.from(block.timestamp);

                await this.projects.mock.ownerOf.withArgs(projectId).returns(owner);

                proposal.start = startTimestamp;
                proposal.end = startTimestamp.add(proposal.end);
                console.log(proposal.start);
                // Execute the transaction.
                const tx = await this.contract
                    .connect(caller)
                    .propose(projectId, proposal, target, value, signature, calldata, {
                        value: ethers.utils.parseEther(amount),
                    });
                console.log("soe")
                const counter = await this.contract.connect(caller).proposalIdOf(projectId);
                // Expect an event to have been emitted.
                expect(tx)
                    .to.emit(this.contract, "ProposalCreated")
                    .withArgs(projectId, proposer, counter);
            });
        });
    });

    describe("Failure cases", function () {
        tests.failure.forEach(function (failureTest) {
            it(failureTest.description, async function () {
                const {
                    caller,
                    owner,
                    projectId,
                    proposal,
                    proposer,
                    target,
                    value,
                    signature,
                    calldata,
                    amount,
                    revert,
                } = await failureTest.fn(this);
                const block = await ethers.provider.getBlock("latest");
                const startTimestamp = ethers.BigNumber.from(block.timestamp);

                const tx = await this.projects.mock.ownerOf.withArgs(projectId).returns(owner);

                proposal.start = startTimestamp;
                proposal.end = startTimestamp.add(proposal.end);
                // Execute the transaction.
                await expect(
                    this.contract
                        .connect(caller)
                        .propose(
                            projectId,
                            proposal,
                            target,
                            value,
                            signature,
                            calldata,
                            { value: amount },
                        ),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
