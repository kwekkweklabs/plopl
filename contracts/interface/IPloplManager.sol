// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPloplManager
 * @dev Interface for main Plopl registry that manages recipes
 */
interface IPloplManager {
    /**
     * @dev Creates a new plop registry for a new recipeId
     * @param _initNotary The initial notary address
     * @return The address of the newly created registry contract
     */
    function createPlopRegistry(address _initNotary) external returns (address);

    /**
     * @dev Gets the registry address for a specific recipe
     * @param _recipeId The unique identifier for the recipe
     * @return The address of the registry contract for this recipe
     */
    function getRegistry(uint256 _recipeId) external view returns (address);

    /**
     * @dev Sets the plop signer address
     * @param _ploplSigner The address of the plop signer
     */
    function setPloplSigner(address _ploplSigner) external;

    /**
     * @dev Gets the Plopl signer address
     * @return The address of the plop signer
     */
    function getPloplSigner() external view returns (address);
}
