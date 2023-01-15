import { ethers } from "hardhat";
import { expect } from "chai";

const tests = {
    success: [
        {
            description: "no uri, caller is owner",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                recipient: addrs[1].address,
                amount: 100,
                expectation: {
                    projectId: 1,
                },
            }),
        },
    ],
    failure: [],
};

export default function () {
    describe("Success cases", function () {
        tests.success.forEach(function (successTest) {
            it(successTest.description, async function () {
                const {
                    caller,
                    amount,
                    recipient,
                    setup: { create } = {},
                    expectation: { projectId },
                } = await successTest.fn(this);

                // // Setup by creating a project.
                // if (create) {
                //   await this.contract
                //     .connect(caller)
                //     .tap(create.owner, create.handle, create.uri);
                // }

                // Execute the transaction.
                const tx = await this.contract.connect(caller).tap(amount, recipient);

                // Expect an event to have been emitted.
                expect(tx).to.emit(this.contract, "Tap").withArgs(amonut, recipient);
                const provider = waffle.provider;
                const balanceETH = await provider.getBalance(this.addr[0].address);

                console.log(balanceETH);
                // Expect the stored values to equal the set values.
                // expect(this.addrs[0].address).to.equal(handle);
                // expect(storedProject).to.equal(projectId);
                // expect(storedUri).to.equal(uri);
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
                        .create(create.owner, create.handle, create.uri);

                    if (transfer) {
                        await this.contract
                            .connect(caller)
                            .transferHandle(1, transfer.to, transfer.handle);
                    }
                }

                // Execute the transaction.
                await expect(
                    this.contract.connect(caller).create(owner, handle, uri),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
