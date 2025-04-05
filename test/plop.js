const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Plopl Registry System", function () {
    let ploplManager;
    let plopRegistry;
    let owner;
    let notary;
    let user;
    let ploplSigner;
    let recipeId;

    beforeEach(async function () {
        // Get signers
        [owner, notary, user, ploplSigner] = await ethers.getSigners();

        // Deploy PloplManager
        const PloplManager = await ethers.getContractFactory("PloplManager");
        ploplManager = await PloplManager.deploy();
        await ploplManager.waitForDeployment();

        // Set the Plopl signer
        await ploplManager.setPloplSigner(ploplSigner.address);

        // Create a new registry with notary
        const tx = await ploplManager.createPlopRegistry(notary.address);
        const receipt = await tx.wait();

        // Get the registry address from events
        const event = receipt.logs.find(
            (log) => log.fragment && log.fragment.name === "PlopRegistryCreated"
        );
        const registryAddress = event.args[1];
        recipeId = event.args[0];

        // Get the PlopRegistry instance
        plopRegistry = await ethers.getContractAt("PlopRegistry", registryAddress);
    });

    describe("Registry Setup", function () {
        it("should properly initialize registry with correct notary", async function () {
            const isNotary = await plopRegistry.isNotary(notary.address);
            expect(isNotary).to.be.true;
        });

    });

    describe("Plop Submission", function () {
        let plop;
        let ploplSignature;
        let notarySignature;
        let userSignature;

        beforeEach(async function () {
            // Create a sample plop (hash of some data)
            plop = ethers.keccak256(ethers.toUtf8Bytes("test plop data"));

            // Sign the plop with different parties
            ploplSignature = await ploplSigner.signMessage(ethers.getBytes(plop));
            notarySignature = await notary.signMessage(ethers.getBytes(plop));

            // Create combined hash for user to sign
            const combinedHash = ethers.keccak256(
                ethers.solidityPacked(
                    ["bytes32", "bytes", "bytes"],
                    [plop, ploplSignature, notarySignature]
                )
            );

            userSignature = await user.signMessage(ethers.getBytes(combinedHash));
        });

        it("should successfully submit a valid plop", async function () {
            await expect(
                plopRegistry.submitPlop(
                    plop,
                    ploplSignature,
                    notarySignature,
                    userSignature,
                    []
                )
            )
                .to.emit(plopRegistry, "PlopSubmitted")
                .withArgs(user.address, plop, notary.address, await time.latest());
        });

        it("should fail with invalid Plopl signature", async function () {
            // Sign with wrong signer
            const wrongPloplSig = await owner.signMessage(ethers.getBytes(plop));

            await expect(
                plopRegistry.submitPlop(plop, wrongPloplSig, notarySignature, userSignature, [])
            ).to.be.revertedWithCustomError(plopRegistry, "InvalidPloplSignature");
        });

        it("should fail with invalid notary signature", async function () {
            // Sign with non-notary
            const wrongNotarySig = await user.signMessage(ethers.getBytes(plop));

            await expect(
                plopRegistry.submitPlop(plop, ploplSignature, wrongNotarySig, userSignature, [])
            ).to.be.revertedWithCustomError(plopRegistry, "InvalidNotarySignature");
        });
    });

    describe("Data Recovery", function () {
        it("should correctly recover user plop data", async function () {
            const plop = ethers.keccak256(ethers.toUtf8Bytes("test data"));
            const ploplSig = await ploplSigner.signMessage(ethers.getBytes(plop));
            const notarySig = await notary.signMessage(ethers.getBytes(plop));

            const combinedHash = ethers.keccak256(
                ethers.solidityPacked(
                    ["bytes32", "bytes", "bytes"],
                    [plop, ploplSig, notarySig]
                )
            );

            const userSig = await user.signMessage(ethers.getBytes(combinedHash));

            // Submit plop
            await plopRegistry.submitPlop(plop, ploplSig, notarySig, userSig, []);

            // Recover data
            const [recoveredHash, timestamp] = await plopRegistry.recoverUserPlopData(
                user.address
            );

            expect(recoveredHash).to.equal(combinedHash);
            expect(timestamp).to.be.gt(0);
        });

        it("should fail to recover data for non-existent plop", async function () {
            await expect(
                plopRegistry.recoverUserPlopData(user.address)
            ).to.be.revertedWithCustomError(plopRegistry, "PlopNotFound");
        });
    });

    describe("Edge Cases", function () {
        it("should handle multiple plops from same user", async function () {
            // Submit first plop
            const plop1 = ethers.keccak256(ethers.toUtf8Bytes("plop 1"));
            const ploplSig1 = await ploplSigner.signMessage(ethers.getBytes(plop1));
            const notarySig1 = await notary.signMessage(ethers.getBytes(plop1));
            const combined1 = ethers.keccak256(
                ethers.solidityPacked(
                    ["bytes32", "bytes", "bytes"],
                    [plop1, ploplSig1, notarySig1]
                )
            );
            const userSig1 = await user.signMessage(ethers.getBytes(combined1));

            await plopRegistry.submitPlop(plop1, ploplSig1, notarySig1, userSig1, []);

            // Submit second plop (should overwrite)
            const plop2 = ethers.keccak256(ethers.toUtf8Bytes("plop 2"));
            const ploplSig2 = await ploplSigner.signMessage(ethers.getBytes(plop2));
            const notarySig2 = await notary.signMessage(ethers.getBytes(plop2));
            const combined2 = ethers.keccak256(
                ethers.solidityPacked(
                    ["bytes32", "bytes", "bytes"],
                    [plop2, ploplSig2, notarySig2]
                )
            );
            const userSig2 = await user.signMessage(ethers.getBytes(combined2));

            await plopRegistry.submitPlop(plop2, ploplSig2, notarySig2, userSig2, []);

            // Verify latest plop data
            const [recoveredHash] = await plopRegistry.recoverUserPlopData(user.address);
            expect(recoveredHash).to.equal(combined2);
        });

        it("should fail with malformed signatures", async function () {
            const plop = ethers.keccak256(ethers.toUtf8Bytes("test"));
            const malformedSig = "0x1234"; // Invalid signature length

            await expect(
                plopRegistry.submitPlop(plop, malformedSig, malformedSig, malformedSig, [])
            ).to.be.revertedWithCustomError(plopRegistry, "InvalidSignatureLength");
        });
    });
});