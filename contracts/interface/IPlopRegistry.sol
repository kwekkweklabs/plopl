// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPlopRegistry
 * @dev Interface for each recipe's proof (plop) registry
 */
interface IPlopRegistry {
    /**
     * @dev Submit a proof (plop) with attestations from multiple parties
     * @param plop The proof data (typically a hash)
     * @param ploplSignature Signature from the Plopl platform
     * @param notarySignature Signature from the notary (web3 dapp)
     * @param userSignature Signature from the user
     */
    function submitPlop(
        bytes32 plop,
        bytes calldata ploplSignature,
        bytes calldata notarySignature,
        bytes calldata userSignature,
        bytes[] calldata encData
    ) external;

    /**
     * @dev Check if an address has a valid proof (plop)
     * @param user The address to check
     * @return True if the user has a valid proof, false otherwise
     */
    function hasValidPlop(address user) external view returns (bool);

    /**
     * @dev Recovers the user plop data
     * @param user The address of the user
     * @return combinedData The combined hash of plop and signatures
     * @return timestamp The timestamp when the plop was submitted
     * @return rawPlop The original plop data
     * @return notaryUsed The address of the notary that signed this plop
     * @return encryptedData Any additional encrypted data stored with the plop
     */
    function recoverUserPlopData(
        address user
    )
        external
        view
        returns (
            bytes32 combinedData,
            uint256 timestamp,
            bytes32 rawPlop,
            address notaryUsed,
            bytes[] memory encryptedData
        );

    /**
     * @dev Update notary status of an address
     * @param notaryAddress The address to update
     * @param isNotary Whether this address should be a notary
     */
    function updateNotary(address notaryAddress, bool isNotary) external;
}
