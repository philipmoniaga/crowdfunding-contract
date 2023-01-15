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
            description: "create proof booster",
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
            description: "failed create proof booster, not registered",
            fn: ({ deployer, addrs, bluechip2 }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                bluechip: bluechip2.address,
                tokenId: 12,
                amount: "10",
                revert: "BoosterNotRegisterd()",
            }),
        },
        {
            description: "failed create proof booster, not owner",
            fn: ({ deployer, addrs, bluechip1 }) => ({
                caller: deployer,
                owner: addrs[0].address,
                projectId: 1,
                tokenId: 12,
                bluechip: bluechip1.address,
                amount: "10",
                revert: "NotNFTOwner()",
            }),
        },
        {
            description: "failed create proof booster, no balance",
            fn: ({ deployer, addrs, bluechip1 }) => ({
                caller: deployer,
                owner: deployer.address,
                projectId: 1,
                bluechip: bluechip1.address,
                tokenId: 12,
                amount: "0",
                revert: "InsufficientBalance()",
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
                const tx = await this.contract
                    .connect(caller)
                    .createProof(this.bluechip1.address, tokenId, {
                        value: ethers.utils.parseEther(amount),
                    });

                const now = await this.getTimestampFn(tx.blockNumber);
                expect(tx)
                    .to.emit(this.contract, "CreateProof")
                    .withArgs(
                        owner,
                        this.bluechip1.address,
                        tokenId,
                        result,
                        now.add(ethers.BigNumber.from(30).mul(DAY)),
                        2,
                    );
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

                await expect(
                    this.contract
                        .connect(caller)
                        .createProof(bluechip, tokenId, { value: ethers.utils.parseEther(amount) }),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
