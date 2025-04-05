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
     * @dev Get the timestamp of when the Plop was created
     * @param plop The proof data
     * @return The timestamp of the Plop
     */
    function getPlopTimestamp(bytes32 plop) external view returns (uint256);

    /**
     * @dev Recovers the owner address from a proof
     * @param proof The proof data
     * @return The owner's address
     */
    function recoverOwner(bytes32 proof) external view returns (address);

    /**
     * @dev Recovers the user plop data
     * @param user The address of the user
     * @return The plop data and timestamp
     */
    function recoverUserPlopData(
        address user
    ) external view returns (bytes32, uint256);

    /**
     * @dev Update notary status of an address
     * @param notaryAddress The address to update
     * @param isNotary Whether this address should be a notary
     */
    function updateNotary(address notaryAddress, bool isNotary) external;

    /**
     * @dev Get all notaries
     * @return Array of notary addresses
     */
    function getNotaries() external view returns (address[] memory);
}
