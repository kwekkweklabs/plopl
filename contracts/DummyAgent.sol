// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./PloplAgent.sol";

/**
 * @title DummyAgent
 * @dev A dummy implementation of PloplAgent for testing purposes
 */
contract DummyAgent is PloplAgent {
    constructor(address ploplManagerAddress) PloplAgent(ploplManagerAddress) {}

    /**
     * @dev Example function that requires a user to have a specific plop
     * @param recipeId The recipe ID to check
     * @return A success message
     */
    function protectedFunction(
        uint256 recipeId
    ) external view onlyPlopped(recipeId) returns (string memory) {
        return "Access granted!";
    }
}
