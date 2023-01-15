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
            description: "renew proof booster",
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
            description: "failed renew proof booster, not owner",
            fn: ({ deployer, addrs, bluechip1 }) => ({
                caller: deployer,
                owner: addrs[0].address,
                projectId: 1,
                tokenId: 12,
                bluechip: bluechip1.address,
                amount: "10",
                revert: "UnAuthorized()",
            }),
        }
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
                
                const tx2 = await this.contract
                    .connect(caller)
                    .renewProof(this.bluechip1.address, tokenId);
                const now = await this.getTimestampFn(tx2.blockNumber);
                expect(tx2)
                    .to.emit(this.contract, "RenewProof")
                    .withArgs(
                        owner,
                        this.bluechip1.address,
                        tokenId,
                        result,
                        now.add(ethers.BigNumber.from(30).mul(DAY))
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
                        .renewProof(bluechip, tokenId),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
