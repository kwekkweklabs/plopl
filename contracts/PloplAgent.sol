// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interface/IPloplManager.sol";
import "./interface/IPlopRegistry.sol";

/**
 * @title PloplAgent
 * @dev Base contract for dapps that want to integrate with Plopl
 */
contract PloplAgent {
    // Reference to the Plopl manager
    IPloplManager public ploplManager;

    constructor(address ploplManagerAddress) {
        require(ploplManagerAddress != address(0), "PL_ZERO_ADDRESS");
        ploplManager = IPloplManager(ploplManagerAddress);
    }

    /**
     * @dev Modifier to check if the sender has a valid plop for a recipe
     * @param recipeId The recipe ID to check
     */
    modifier onlyPlopped(uint256 recipeId) {
        address registryAddress = ploplManager.getRegistry(recipeId);
        require(
            IPlopRegistry(registryAddress).hasValidPlop(msg.sender),
            "PL_NOT_PLOPPED"
        );
        _;
    }
}
