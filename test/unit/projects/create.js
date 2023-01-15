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
                uri: "",
                terminal: ethers.constants.AddressZero,
                expectation: {
                    projectId: 1,
                },
            }),
        },
        {
            description: "no uri, caller is not owner",
            fn: ({ deployer, addrs }) => ({
                caller: deployer,
                owner: addrs[0].address,
                handle: ethers.utils.formatBytes32String("some-handle"),
                uri: "",
                terminal: ethers.constants.AddressZero,
                expectation: {
                    projectId: 1,
                },
            }),
        },
        {
            description: "with uri",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                handle: ethers.utils.formatBytes32String("some-handle"),
                uri: "some-uri",
                terminal: ethers.constants.AddressZero,
                expectation: {
                    projectId: 1,
                },
            }),
        },
        {
            description: "second project",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                handle: ethers.utils.formatBytes32String("some-handle"),
                uri: "some-uri",
                terminal: ethers.constants.AddressZero,
                expectation: {
                    projectId: 2,
                },
                setup: {
                    create: {
                        owner: deployer.address,
                        handle: ethers.utils.formatBytes32String("some-other-handle"),
                        uri: "some-uri",
                        terminal: ethers.constants.AddressZero,
                    },
                },
            }),
        },
    ],
    failure: [
        {
            description: "no handle",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                handle: ethers.utils.formatBytes32String(""),
                uri: "",
                terminal: ethers.constants.AddressZero,
                revert: "EmptyHandle()",
            }),
        },
        {
            description: "handle taken",
            fn: ({ deployer }) => ({
                caller: deployer,
                owner: deployer.address,
                handle: ethers.utils.formatBytes32String("some-handle"),
                uri: "some-uri",
                terminal: ethers.constants.AddressZero,
                setup: {
                    create: {
                        owner: deployer.address,
                        handle: ethers.utils.formatBytes32String("some-handle"),
                        uri: "some-uri",
                    },
                },
                revert: "TakenedHandle()",
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
                    uri,
                    terminal,
                    setup: { create } = {},
                    expectation: { projectId },
                } = await successTest.fn(this);

                // Setup by creating a project.
                if (create) {
                    await this.contract
                        .connect(caller)
                        .create(create.owner, create.handle, terminal);
                }

                // Execute the transaction.
                const tx = await this.contract.connect(caller).create(owner, handle, terminal);

                // Expect an event to have been emitted.
                expect(tx)
                    .to.emit(this.contract, "Create")
                    .withArgs(projectId, owner, handle, caller.address);

                // Get the stored handle value.
                const storedHandle = await this.contract.handleOf(projectId);

                // Get the stored project value.
                const storedProject = await this.contract.projectFor(handle);

                // Expect the stored values to equal the set values.
                expect(storedHandle).to.equal(handle);
                expect(storedProject).to.equal(projectId);
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
                        .create(create.owner, create.handle, terminal);

                    if (transfer) {
                        await this.contract
                            .connect(caller)
                            .transferHandle(1, transfer.to, transfer.handle);
                    }
                }

                // Execute the transaction.
                await expect(
                    this.contract.connect(caller).create(owner, handle, terminal),
                ).to.be.revertedWith(revert);
            });
        });
    });
}
