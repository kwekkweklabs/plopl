export const RegistryABI = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_recipeId',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_initNotary',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'InvalidNotarySignature',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidPloplSignature',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidSignatureLength',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidUserSignature',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NotManager',
    type: 'error',
  },
  {
    inputs: [],
    name: 'PlopNotFound',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'notaryAddress',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'isNotary',
        type: 'bool',
      },
    ],
    name: 'NotaryUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'plop',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'notary',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'PlopSubmitted',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
    ],
    name: 'hasValidPlop',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'isNotary',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'ploplAuth',
    outputs: [
      {
        internalType: 'contract IPloplAuth',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'recipeId',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
    ],
    name: 'recoverUserPlopData',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'combinedData',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
      {
        internalType: 'bytes32',
        name: 'rawPlop',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'notaryUsed',
        type: 'address',
      },
      {
        internalType: 'bytes[]',
        name: 'encData',
        type: 'bytes[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'plop',
        type: 'bytes32',
      },
      {
        internalType: 'bytes',
        name: 'ploplSignature',
        type: 'bytes',
      },
      {
        internalType: 'bytes',
        name: 'notarySignature',
        type: 'bytes',
      },
      {
        internalType: 'bytes',
        name: 'userSignature',
        type: 'bytes',
      },
      {
        internalType: 'bytes[]',
        name: 'encData',
        type: 'bytes[]',
      },
    ],
    name: 'submitPlop',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'notaryAddress',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: '_isNotary',
        type: 'bool',
      },
    ],
    name: 'updateNotary',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
      {
        internalType: 'bytes',
        name: 'signature',
        type: 'bytes',
      },
    ],
    name: 'verifyUserSignature',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];
