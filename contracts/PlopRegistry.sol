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
    address[] private _notaries;

    // Events
    event PlopSubmitted(
        address indexed user,
        bytes32 indexed plop,
        address notary,
        uint256 timestamp
    );
    event NotaryUpdated(address indexed notaryAddress, bool isNotary);

    // Custom errors
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

        // Verify signatures using library
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
        if (user == address(0)) {
            revert InvalidUserSignature();
        }

        // Store all data in a single struct to optimize gas
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
        return _plopData[user].plop != bytes32(0);
    }

    function getPlopTimestamp(bytes32 plop) external view returns (uint256) {
        address owner = recoverOwner(plop);
        return owner != address(0) ? _plopData[owner].timestamp : 0;
    }

    function recoverOwner(bytes32 plop) public view override returns (address) {
        uint256 len = _notaries.length;
        for (uint256 i = 0; i < len; ) {
            address potentialOwner = _notaries[i];
            if (_plopData[potentialOwner].plop == plop) {
                return potentialOwner;
            }
            unchecked {
                ++i;
            }
        }
        return address(0);
    }

    function recoverUserPlopData(
        address user
    ) external view returns (bytes32 combinedData, uint256 timestamp) {
        PlopData storage data = _plopData[user];
        if (data.plop == bytes32(0)) revert PlopNotFound();
        return (data.signedHash, data.timestamp);
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

        if (_isNotary && !isNotary[notaryAddress]) {
            isNotary[notaryAddress] = true;
            _notaries.push(notaryAddress);
        } else if (!_isNotary && isNotary[notaryAddress]) {
            isNotary[notaryAddress] = false;
            uint256 len = _notaries.length;
            for (uint256 i = 0; i < len; ) {
                if (_notaries[i] == notaryAddress) {
                    _notaries[i] = _notaries[len - 1];
                    _notaries.pop();
                    break;
                }
                unchecked {
                    ++i;
                }
            }
        }

        emit NotaryUpdated(notaryAddress, _isNotary);
    }

    function getNotaries() external view override returns (address[] memory) {
        return _notaries;
    }
}
