import { ethers } from "hardhat";
import { expect } from "chai";

const tests = {
    success: [
        {
            description: "no uri, caller is owner",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                handle: ethers.utils.formatBytes32String("some-handle"),
                projectUri: "",
                contractUri: "",
                membershipPassUri: "",
                tiers:[
                    {
                        tierFee:10,
                        tierCapacity:10,
                        target:100
                    }
                ],
                params:
                    {
                        duration:10,
                        cycleLimit:10,

                    }
                ,
                auctionedPass:[
                    {
                        salePrice:100,
                        weight:10
                    }
                ],
                terminal: ethers.constants.AddressZero,
                expectation: {
                    projectId: 1,
                },
            }),
        }
    ],
    failure: [
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
                    tiers
                } = await successTest.fn(this);

                
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
                    uri,
                    terminal,
                    setup: { create, transfer } = {},
                    revert,
                } = failureTest.fn(this);

                // Setup by creating a project.
                if (create) {
                    await this.contract
                        .connect(caller)
                        .create(create.owner, create.handle, create.uri, terminal);

                    if (transfer) {
                        await this.contract
                            .connect(caller)
                            .transferHandle(1, transfer.to, transfer.handle);
                    }
                }

                // Execute the transaction.
                await expect(
                    this.contract.connect(caller).create(owner, handle, uri, terminal),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
