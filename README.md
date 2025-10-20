# Xtreamly Hedera Service

### Architecture

The system composes of two entities both deployed on Hedera ecosystem:
- Signal NFT
- Trader Smart Contract

The NFT is used for storing a single signal (using its metadata). The signal consists of a byte packed encoded expression which consists of 
- Token (e.g. ETH)
- Action (e.g. LONG)
- Timestamp

Creation and updating of NFT is done usign Hedera SDK. NFT is deployed once (single collection that has single minted with serial number of 1) but its metadata is 
updated on regular basis (or at any desired time) offchain using the nft signal app class.

The signal NFT is then read by the Trader contract to decide which direction to trade in. When ACTION is NONE no trade happens, when LONG, it would buy the token using USDC and vice versa. 

Selling and buying happens on Saucerswap by the trader contract. Note that like many DeFi protocols you need to approve both the USDC and the token to this contract before calling autoTrade.

When autoTrade is called, trader contract checks the NFT for signal and decides whether which direction to swap. The amount to swap is supplied as the parameter.

The contract can be used by any Hedera smart contract enabled wallet but the signal NFT can only be updated by Xtreamly wallet.

The reason for developing the trader contract was to be used as a template for other protocols that want to use the Xtreamly AI signal in their own applications on Hedera. In order to do so, they just need to 
add the part to read from signal NFT. We made the trader contract fully functional so that other developers have easier time intergrating Xtreamly having a funtioning example.

This doesn't mean the trader contract is production ready by any means. It hasn't passed any security checks and thus it should only be used for educational purposes

## Repository structure

Repository consists of three parts:

- Hedera trader contract source (single .sol file) and abi
- Hedera SDK to interact with both the contract and Hedera chain for deploying and updating signal NFT
- Backend service that allows interaction with the smart contract and NFT to enable a wallet to use auto trade (Using AI generated signal to trade)

The backend service exposes a small Express API used to:

- bootstrap user allowances against the Hedera auto-trade contract
- trigger automated swaps based on Xtreamly signals
- publish trading signals into a Hedera NFT that downstream contracts can read
- perform manual signal updates and simple health checks

The codebase is written in TypeScript, compiled to Node.js, and relies on the official Hedera SDK.


## Requirements
- Node.js 18+
- npm 9+
- Access to Hedera Mainnet credentials and the Xtreamly API


## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template and fill in your values:
   ```bash
   cp .env.example .env   # if you do not have an example, create .env manually
   ```
3. Build the TypeScript sources:
   ```bash
   npm run build
   ```
4. Start the API:
   ```bash
   npm start
   ```

During development you can run `npm run dev` to keep TypeScript compiling in watch mode, and in a second terminal run `npm start` so that the server reloads compiled output.


## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | Optional | Port exposed by the Express server (defaults to 3000). |
| `NODE_ENV` | Optional | Set to `production` to enforce API key checks on every endpoint. |
| `XTREAMLY_API_BASE_URL` | Yes | Base URL for the Xtreamly signals API (for example `https://api.xtreamly.ai`). |
| `XTREAMLY_USER_MANAGEMENT_API_KEY` | Yes | API key injected in calls to Xtreamly and required in the `x-api-key` header when `NODE_ENV=production`. |
| `HEDERA_ACCOUNT_ID` | Yes | Account ID operating transactions on Hedera. |
| `HEDERA_PRIVATE_KEY` | Yes | Private key (ECDSA) for `HEDERA_ACCOUNT_ID`. |
| `SMARTCONTRACT_BYTECODE` | Yes | Base64 bytecode used when deploying the auto-trade contract. |
| `SMARTCONTRACT_ID` | Yes | Contract ID for the deployed auto-trade contract. |
| `ROUTER_ID` | Yes | Hedera contract ID for the Saucerswap router. |
| `USDC_TOKEN_ID` | Yes | Token ID for the USDC pool token. |
| `WETH_TOKEN_ID` | Yes | Token ID for the WETH pool token. |
| `SIGNAL_NFT_COLLECTION_TOKEN_ID` | Yes | NFT collection ID that stores the latest trading signal. |
| `SIGNAL_NFT_SERIAL_NUMBER` | Yes | Serial number for the signal NFT within the collection. |


## API Reference

All endpoints accept and return JSON. When running in production mode you must pass the `x-api-key` header with the value of `XTREAMLY_USER_MANAGEMENT_API_KEY`.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/setup` | Approves USDC and WETH spending limits for the auto-trade contract. |
| `POST` | `/trade` | Calls the on-chain auto trading function with provided USDC and WETH amounts. |
| `POST` | `/signal` | Fetches the latest Xtreamly ETH signal and writes it to the signal NFT. |
| `POST` | `/signal-manual` | Manually writes a supplied signal payload to the NFT. |
| `GET` | `/health` | Liveness check returning status information. |

### Request examples

```bash
curl -X POST http://localhost:3000/trade \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: <XTREAMLY_USER_MANAGEMENT_API_KEY>' \
  -d '{"usdc":"5","weth":"0.05"}'
```

```bash
curl -X POST http://localhost:3000/signal-manual \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: <XTREAMLY_USER_MANAGEMENT_API_KEY>' \
  -d '{"token":"ETH","action":"LONG","timestamp": 1715616000000}'
```


## Docker
Build and run the containerized service:

```bash
docker build -t xtreamly-hedera .
docker run --env-file .env -p 3000:3000 xtreamly-hedera
```


## Project Structure
- `src/server.ts` – Express API and request lifecycle instrumentation.
- `src/contract_app.ts` – Helpers to deploy, initialize, and interact with the Hedera auto-trade contract.
- `src/nft_signal_app.ts` – Logic for fetching Xtreamly signals and updating the signal NFT.
- `src/hedera.ts` – Hedera SDK wrapper with token, contract, and swap utilities.
- `src/xtreamly.ts` – Minimal client for the Xtreamly signals API.
- `contract.sol` – Smart contract source deployed to Hedera.
- `Dockerfile` – Container build instructions.


## Troubleshooting
- Verify all required environment variables are populated before starting the service.
- The Hedera SDK requires network connectivity to the appropriate environment (mainnet or testnet); ensure firewall rules allow outbound access.
- If `npm start` throws `Cannot find module` errors, confirm `npm run build` succeeded and the `dist` directory was generated.
