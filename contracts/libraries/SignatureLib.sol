// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

library SignatureLib {
    error InvalidSignatureLength();

    function recoverSigner(
        bytes32 message,
        bytes calldata signature
    ) internal pure returns (address) {
        if (signature.length != 65) revert InvalidSignatureLength();

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (v < 27) v += 27;

        bytes32 signHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", message)
        );

        return ecrecover(signHash, v, r, s);
    }

    function verifySigner(
        bytes32 message,
        bytes calldata signature,
        address expectedSigner
    ) internal pure returns (bool) {
        return recoverSigner(message, signature) == expectedSigner;
    }
}
