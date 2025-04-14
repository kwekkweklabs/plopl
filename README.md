# PLOPL

### _Popping Proofs Onchain_

**Plopl** is the Proof Layer for Onchain Privacy. It helps users prove things about their Web2 identity or data (like event participation, social stats, or account status) without revealing sensitive information. Plopl makes the process fun, fast, and dead-simple for developers.

> Our motto?  
> **“Popping proofs onchain.”**  
> Because bridging offchain proofs onchain should be fun.

## What is Plopl?
### Trustless Off-Chain to On-Chain Integration
PLOPL is a developer-friendly toolkit that enables trustless integration of off-chain data to on-chain systems. Using zkTLS technology, PLOPL allows API calls made in a user's browser to be cryptographically verified and tamper-proof.

- **Plopl** lets Web3 apps request a verifiable _Plop_ (that’s what we call a proof) from a user's real-world data, like how many ETHGlobal events they've attended.
- Proofs are verified using **recipes**, which describe where to fetch data from, what to match, and how to validate it, all in a clean JSON format.
- Once a Plop is created, it’s stored **onchain**, **encrypted**, and **bound to the user’s signature** for security and privacy.

## What's a Plop?

> **Plop (noun):** A privacy-preserving proof created by the Plopl Extension.  
> **Plops (plural):** A collection of your internet flexes, verified onchain.

Examples of Plops you can create:

- “I’ve attended 3 ETHGlobal events.”
- “I have over 10k Instagram followers.”
- “I’ve been a Binance user since 2022.”

## What Problem Does PLOPL Solve?

Blockchain applications often need trusted data from off-chain sources, but this traditionally creates centralization risks or requires complex oracle solutions. PLOPL bridges this gap by enabling:

- Trustless verification of API responses
- Direct browser-to-contract data flow
- Simple developer implementation
- User-controlled data sovereignty

## How It Works

PLOPL leverages zero-knowledge proofs to verify the authenticity of API calls. When a user interacts with a supported API, the PLOPL extension:

1. Intercepts or monitors the API call
2. Verifies the response against a predefined schema
3. Generates a cryptographic proof (pProof)
4. Makes this proof available for on-chain verification

The result is a tamper-proof attestation that specific off-chain data was genuinely received by the user's browser.

## User Flow

### For Developers:
1. **Create a Proof Schema** - Define what API calls and responses should be verified, with an intuitive interface (AI-assisted schema creation available)
2. **Deploy Proof Registry** - Once created, the proof schema is deployed and available for anyone to use
3. **Integrate with Frontend** - Implement PLOPL verification on your frontend to guide users through the proof generation process
4. **Utilize Backend Services** - Each proof type includes webhooks and indexing via nodit, making off-chain verification easy

### For End Users:
1. Install the PLOPL browser extension
2. Visit a PLOPL-integrated application
3. Follow guided steps to generate proofs when needed
4. Submit transactions with cryptographic verification of off-chain data

> 💡 You control your Plops. Apps just verify them. 
> With an open PlopRegistry, you only need one time verification for the same **recipe**.

## Example Use Cases

### Voting Verification
Verify that a user has genuinely cast 10 votes for "Project A" on a voting platform like Kaito. PLOPL intercepts calls to `https://api.kaito.ai/my-votes`, verifies the data matches the expected schema, and generates a proof that can be used in smart contracts.

### NFT Eligibility
Prove ownership of digital assets across platforms without sharing credentials.

### Credit Scoring
Verify financial information from traditional systems without exposing sensitive data.

### Game Achievements
Prove in-game accomplishments for on-chain rewards without requiring the game to be fully on-chain.

## Getting Started

[Coming Soon: Installation instructions, documentation links, and quick-start guides]

## Why Choose PLOPL?

- **Developer Simplicity** - Intuitive API and documentation
- **User Privacy** - No sensitive data exposure
- **Trustless Verification** - Cryptographic guarantees
- **Extensibility** - Create custom proof schemas for any API
- **Indexed Proofs** - All proofs are indexed and easily accessible

So whether you're building a gating app, a mint condition, or an onchain resume —  
**Plopl lets you plug in verified facts with zero oversharing.**

---
##  Plopl Workflow

1. **Proof Request**  
    A Web3 app (using Plopl SDK) requests a proof by recipe ID — for example:  
    `"ethglobal-event-check"`. The Web3 app should have a smart contract which inherits `IPloplRecipient`.
    
2. **Prompt User**
    The Plopl Extension opens the required `prepareUrl` (e.g. `https://ethglobal.com/home`) and instructs the user to log in if not already.
    
3. **Intercept API Call**  
    Once logged in, the user naturally triggers the matching API call (defined in the recipe).  
    The extension intercepts this call and captures the response.
    
4. **Process Response**  
    The extension extracts the target fields and applies any `.length()`, `.find()`, or inline `expected` conditions (like `x >= 2`).
    
5. **Proof Generation**  
    If all conditions pass, the extension generates a proof (hash, signature, or zkProof depending on setup).
    
6. **Proof Submission**  
    The signed proof is returned to the dApp for verification, gating, minting, or rewards.
    
### 🧠 Summary

> The proof starts with a Web3 request, flows through a real Web2 interaction, and ends back in Web3 — **verifiable, privacy-preserving, and user-controlled**.

---
# Plopl Recipe

This guide explains what is inside a `recipe file for Plopl, a schema that defines how to capture and verify Web2 API data to generate privacy-preserving proofs.

Plopl recipes are designed to:

- Identify the relevant API call from a logged-in session.
    
- Match specific fields in the response against provided conditions.
    

    

> ℹ️ If the user is already logged in, Plopl will automatically detect the request when they open the target page. No manual login or API call needed.

---


### Core Schema
Each recipe is defined as a `recipe.json` file with its id as the unique file identifer, so the naming convention becomes `{{id}}.recipe.json`. Below is a breakdown of its structure.

| Field         | Type                | Description                                                                                                                 |
| ------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `id`          | Number              | Unique numeric identifier that is bind to the id in RecipeRegistry contract.                                                |
| `slug`        | String              | Readable unique identifier for the recipe. Example: `"instagram-followers"`                                                 |
| `description` | String              | A short explanation of what this recipe proves.                                                                             |
| `prepareUrl`  | String              | A URL the user can visit to log in (if needed) before the API call is made.                                                 |
| `request`     | Object              | Describes the expected API call.                                                                                            |
| ├─ `url`      | String              | The target API endpoint. May include `{{variables}}`.                                                                       |
| ├─ `method`   | String              | HTTP method to watch (e.g., `"GET"`, `"POST"`).                                                                             |
| └─ `args`     | Object _(Optional)_ | Optional request arguments, including:                                                                                      |
|               |                     | - `urlParams`: parameters for inline substitution in the URL.                                                               |
|               |                     | - `json`: the request body (useful for GraphQL or REST POSTs).                                                              |
| `response`    | Object              | Defines how to extract and validate the response to determine proof eligibility.                                            |
| └─ `match`    | Object              | Defines matching logic using `fields` and optional `expected` expressions.                                                  |
|               |                     | - `fields`: array of field paths to check in the response.                                                                  |
|               |                     | - `expected`: array of conditions to apply to each field. Must match index-wise. Leave as `""` if no condition is required. |

---

### Array Functions

Plopl includes two array helpers for advanced matching.

#### `.length()`

Returns the length of an array.

```json
{
  "fields": ["data.getAttendeeSelf[].length()"],
  "expected": ["x >= 2"]
}
```

> ✅ Proves the user has attended at least 2 events.
ELF for the code
---

#### `.find(fieldName)`

Searches for an object in an array that has a specific value in a given field.

```json
{
  "fields": ["data.getAttendeeSelf[].find(name)"],
  "expected": ["x == 'ETHGlobal Singapore'"]
}
```

> ✅ Proves one of the user’s events is named "ETHGlobal Singapore".

---

### 🧠 Notes on Matching

>All conditions are evaluated securely inside the extension.
  Use `x` in expected conditions to refer to the field value. 
  Field and condition arrays **must be the same length** and match by index.
  Empty string (`""`) means "no condition required", value is just extracted to cook the proof.
    

---

## Use Cases

### ETHGlobal Event Proof

Proves a user has attended **2 or more** ETHGlobal events and one of them is **ETHGlobal Singapore**. Here's the generated recipe for the mentioned purpose.

```json
{
  "id": 1,
  "slug": "ethglobal-event-check",
  "description": "Prove you've attended at least two ETHGlobal events, one of which must be ETHGlobal Singapore.",
  "prepareUrl": "https://ethglobal.com/home",
  "request": {
    "url": "https://api2.ethglobal.com/graphql",
    "method": "POST",
    "args": {
      "json": {
        "variables": {},
        "query": "{ getAttendeeSelf { id slug name startTime endTime status squareLogo { id name path __typename } squareLogoFullUrl meta hackers { id status submission { stage { name __typename } __typename } __typename } judges { id status __typename } guests { id status __typename } mentors { id status __typename } volunteers { id status __typename } schedule { id speakers { id status __typename } __typename } sponsors { id representatives { id status __typename } __typename } __typename } }"
      }
    }
  },
  "response": {
    "match": {
      "fields": [
        ["data.getAttendeeSelf[].length()"],
        ["data.getAttendeeSelf[].find(name)"]
      ],
      "expected": [
        "x >= 2",
        "x == 'ETHGlobal Singapore'"
      ]
    }
  }
}
```

### Workflow

1. The Plopl extension triggeres **user visit** to `https://ethglobal.com/home` (login if needed).
    
2. The extension captures a `POST` request to:
    
    ```
    https://api2.ethglobal.com/graphql
    ```
    
    with a predefined GraphQL query.
    
3. The extension applies matching logic to the response:
    

|Field|Condition|
|---|---|
|`data.getAttendeeSelf[].length()`|`x >= 2`|
|`data.getAttendeeSelf[].find(name)`|`x == 'ETHGlobal Singapore'`|

4. If both conditions pass, the extension generates a valid proof.
    
---

PLOPL bridges the gap between Web2 and Web3, enabling a new generation of hybrid applications that maintain decentralization without sacrificing user experience. </br></br>
**Made with 🧠 by Plopl Coupl.**
