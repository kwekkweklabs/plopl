// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interface/IPlopRegistry.sol";
import "./libraries/SignatureLib.sol";

interface IPloplAuth {
    function getPloplSigner() external view returns (address);
}

/**
 * @title PlopRegistry
 * @dev Registry for plops of a specific recipe
 */
contract PlopRegistry is IPlopRegistry {
    using SignatureLib for bytes32;

    struct PlopData {
        bytes32 plop;
        uint256 timestamp;
        bytes32 signedHash;
        address notaryUsed;
        bytes[] encData;
    }

    uint256 public immutable recipeId;
    IPloplAuth public immutable ploplAuth;

    mapping(address => PlopData) private _plopData;
    mapping(address => bool) public isNotary;

    event PlopSubmitted(
        address indexed user,
        bytes32 indexed plop,
        address notary,
        uint256 timestamp
    );

    event NotaryUpdated(address indexed notaryAddress, bool isNotary);

    error InvalidPloplSignature();
    error InvalidNotarySignature();
    error InvalidUserSignature();
    error NotManager();
    error PlopNotFound();

    constructor(uint256 _recipeId, address _initNotary) {
        recipeId = _recipeId;
        isNotary[_initNotary] = true;
        ploplAuth = IPloplAuth(msg.sender);
    }

    function submitPlop(
        bytes32 plop,
        bytes calldata ploplSignature,
        bytes calldata notarySignature,
        bytes calldata userSignature,
        bytes[] calldata encData
    ) external override {
        address ploplAuthAddress = ploplAuth.getPloplSigner();

        if (!plop.verifySigner(ploplSignature, ploplAuthAddress)) {
            revert InvalidPloplSignature();
        }

        address notarySigner = plop.recoverSigner(notarySignature);
        if (!isNotary[notarySigner] && notarySigner != ploplAuthAddress) {
            revert InvalidNotarySignature();
        }

        bytes32 combinedHash = keccak256(
            abi.encodePacked(plop, ploplSignature, notarySignature)
        );

        address user = combinedHash.recoverSigner(userSignature);
        if (user == address(0) || user != msg.sender) {
            revert InvalidUserSignature();
        }

        _plopData[user] = PlopData({
            plop: plop,
            timestamp: block.timestamp,
            signedHash: combinedHash,
            notaryUsed: notarySigner,
            encData: encData
        });

        emit PlopSubmitted(user, plop, notarySigner, block.timestamp);
    }

    function hasValidPlop(address user) external view override returns (bool) {
        PlopData storage data = _plopData[user];
        return (data.plop != bytes32(0) && isNotary[data.notaryUsed]);
    }

    function recoverUserPlopData(
        address user
    )
        external
        view
        override
        returns (
            bytes32 combinedData,
            uint256 timestamp,
            bytes32 rawPlop,
            address notaryUsed,
            bytes[] memory encData
        )
    {
        PlopData storage data = _plopData[user];
        if (data.plop == bytes32(0)) revert PlopNotFound();
        return (
            data.signedHash,
            data.timestamp,
            data.plop,
            data.notaryUsed,
            data.encData
        );
    }

    function verifyUserSignature(
        address user,
        bytes calldata signature
    ) external view returns (bool) {
        PlopData storage data = _plopData[user];
        if (data.signedHash == bytes32(0)) return false;
        return data.signedHash.verifySigner(signature, user);
    }

    function updateNotary(
        address notaryAddress,
        bool _isNotary
    ) external override {
        if (msg.sender != address(ploplAuth)) revert NotManager();
        isNotary[notaryAddress] = _isNotary;
        emit NotaryUpdated(notaryAddress, _isNotary);
    }
}
