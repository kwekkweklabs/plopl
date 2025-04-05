import { handleSchemaValidation } from './src/utils/schemaValidation.js';

// Sample ETHGlobal response data (matching the actual format from the example)
const sampleResponse = {
  "data": {
    "getAttendeeSelf": [
      {
        "id": 54,
        "slug": "ethonline2023",
        "name": "ETHOnline 2023",
        "__typename": "Event"
      },
      {
        "id": 135,
        "slug": "singapore2024",
        "name": "ETHGlobal Singapore",
        "__typename": "Event"
      },
      {
        "id": 138,
        "slug": "bangkok",
        "name": "ETHGlobal Bangkok",
        "__typename": "Event"
      },
      {
        "id": 160,
        "slug": "pragma-singapore",
        "name": "Pragma Singapore",
        "__typename": "Event"
      },
      {
        "id": 167,
        "slug": "taipei",
        "name": "ETHGlobal Taipei",
        "__typename": "Event"
      },
      {
        "id": 173,
        "slug": "pragma-denver2025",
        "name": "Pragma Denver 2025",
        "__typename": "Event"
      },
      {
        "id": 174,
        "slug": "pragma-taipei",
        "name": "Pragma Taipei",
        "__typename": "Event"
      },
      {
        "id": 212,
        "slug": "agents",
        "name": "Agentic Ethereum",
        "__typename": "Event"
      }
    ]
  }
};

// Test case 1: Check if attended at least 5 events
const schema1 = {
  "response": {
    "match": {
      "fields": ["data.getAttendeeSelf[].length()"],
      "expected": ["x >= 5"]
    }
  }
};

// Test case 2: Check if attended ETHGlobal Singapore
const schema2 = {
  "response": {
    "match": {
      "fields": ["data.getAttendeeSelf[].find(name)"],
      "expected": ["x == 'ETHGlobal Singapore'"]
    }
  }
};

// Test case 3: Mixed validation with one empty condition
const schema3 = {
  "response": {
    "match": {
      "fields": [
        ["data.getAttendeeSelf[].length()"],
        ["data.getAttendeeSelf[].find(name)"]
      ],
      "expected": [
        "",
        "x == 'ETHGlobal Singapore'"
      ]
    }
  }
};

// Run tests
console.log("Test Case 1 - Attended at least 5 events:");
console.log(handleSchemaValidation(schema1, sampleResponse));

console.log("\nTest Case 2 - Attended ETHGlobal Singapore:");
console.log(handleSchemaValidation(schema2, sampleResponse));

console.log("\nTest Case 3 - Mixed validation with one empty condition:");
console.log(handleSchemaValidation(schema3, sampleResponse));

// Add debug logging to understand what's happening
console.log("\nDebug - Data content:");
console.log(JSON.stringify(sampleResponse.data.getAttendeeSelf.map(item => item.name), null, 2)); 