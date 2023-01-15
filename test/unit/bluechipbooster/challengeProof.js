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
            description: "challenge proof booster",
            fn: ({ deployer, addrs, bluechip2 }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                bluechips: [bluechip2.address],
                multipliers: [2],
                tokenId: 12,
                amount: "10",
            }),
        },
    ],
    failure: [
        {
            description: "failed challenge proof booster, proof not registered",
            fn: ({ deployer, bluechip2 }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                tokenId: 12,
                bluechip: bluechip2.address,
                amount: "10",
                revert: "ProofNotRegisterd()",
            }),
        },
        {
            description: "failed redeem proof booster, is owner",
            fn: ({ deployer, bluechip1 }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                bluechip: bluechip1.address,
                tokenId: 12,
                amount: "10",
                revert: "ChallengeFailed()",
            }),
        },
    ],
};

export default function () {
    describe("Success cases", function () {
        tests.success.forEach(function (successTest) {
            it(successTest.description, async function () {
                const { caller, owner, projectId, tokenId, amount } = await successTest.fn(this);

                await this.bluechip1.mock.ownerOf.withArgs(tokenId).returns(owner);
                await this.terminalDirectory.mock.terminalOf
                    .withArgs(projectId)
                    .returns(caller.address);

                const result = ethers.utils.solidityKeccak256(
                    ["address", "uint256"],
                    [this.bluechip1.address, tokenId],
                );
                // Execute the transaction.
                const tx1 = await this.contract
                    .connect(caller)
                    .createProof(this.bluechip1.address, tokenId, {
                        value: ethers.utils.parseEther(amount),
                    });

                //to simulate challenge proof not by same owner we mock again the owner of bluechip nft
                await this.bluechip1.mock.ownerOf.withArgs(tokenId).returns(this.addrs[0].address);

                const tx = await this.contract
                    .connect(caller)
                    .challengeProof(this.bluechip1.address, tokenId);

                expect(tx)
                    .to.emit(this.contract, "ChallengeProof")
                    .withArgs(owner, this.bluechip1.address, tokenId, result);
            });
        });
    });

    describe("Failure cases", function () {
        tests.failure.forEach(function (failureTest) {
            it(failureTest.description, async function () {
                const { caller, owner, projectId, tokenId, amount, revert, bluechip } =
                    await failureTest.fn(this);
                await this.bluechip1.mock.ownerOf.withArgs(tokenId).returns(owner);
                await this.terminalDirectory.mock.terminalOf
                    .withArgs(projectId)
                    .returns(caller.address);

                const tx1 = await this.contract
                    .connect(caller)
                    .createProof(this.bluechip1.address, tokenId, {
                        value: ethers.utils.parseEther(amount),
                    });
                if (revert == "UnAuthorized()") {
                    await this.bluechip1.mock.ownerOf
                        .withArgs(tokenId)
                        .returns(this.addrs[0].address);
                }

                await expect(
                    this.contract.connect(caller).challengeProof(bluechip, tokenId),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
