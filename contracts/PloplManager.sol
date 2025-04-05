// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interface/IPloplManager.sol";
import "./PlopRegistry.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Plopl
 * @dev Main registry contract that manages recipes and their plop registries
 */
contract PloplManager is IPloplManager, Ownable {
    // Mapping from recipe ID to registry address
    mapping(uint256 => address) private _registries;
    uint256 public recipeId;
    address private ploplSigner;

    event PlopRegistryCreated(
        uint256 indexed recipeId,
        address indexed registryAddress
    );
    event PlopSignerUpdated(address indexed ploplSigner);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Creates a new plop registry
     * @return registryAddr The address of the newly created registry contract
     */
    function createPlopRegistry(
        address _initNotary
    ) external override returns (address registryAddr) {
        uint256 nextRecipeId = recipeId + 1;
        require(_registries[nextRecipeId] == address(0), "PL_RECIPE_EXIST");

        PlopRegistry registry = new PlopRegistry(nextRecipeId, _initNotary);
        _registries[nextRecipeId] = address(registry);

        recipeId = nextRecipeId;
        registryAddr = address(registry);
        emit PlopRegistryCreated(nextRecipeId, registryAddr);
    }

    /**
     * @dev Gets the registry address for a specific recipe
     * @param _recipeId The unique identifier for the recipe
     * @return The address of the registry contract for this recipe
     */
    function getRegistry(
        uint256 _recipeId
    ) external view override returns (address) {
        address registryAddress = _registries[_recipeId];
        require(registryAddress != address(0), "PL_RECIPE_NOT_EXIST");
        return registryAddress;
    }

    /**
     * @dev Sets the plop signer address
     * @param _ploplSigner The address of the plop signer
     */
    function setPloplSigner(address _ploplSigner) external onlyOwner {
        require(_ploplSigner != address(0), "PL_ZERO_ADDRESS");
        ploplSigner = _ploplSigner;
        emit PlopSignerUpdated(_ploplSigner);
    }

    /**
     * @dev Gets the Plopl signer address
     * @return The address of the plop signer
     */
    function getPloplSigner() external view override returns (address) {
        return ploplSigner;
    }
}
