# Response Network On-Chain Rollout

This package folder is the on-chain target for the Frontier Response Network frontend.
The module now contains a real shared-object state machine instead of an empty placeholder.

## Frontend contract assumptions

The current frontend chain adapter is wired to these Move entry points inside
`response_network::response_network`:

- `create_request`
- `accept_request`
- `mark_in_progress`
- `mark_awaiting_confirmation`
- `confirm_completion`
- `cancel_open_request`

The frontend assumes:

- `create_request` creates a `RescueRequest` object.
- Each request is addressable by its object id.
- The registry is a shared object passed to `create_request`.
- Reward escrow is supplied as a split SUI coin argument.
- After a successful write, the frontend keeps a local mirror so the board remains usable
  before an indexed read model exists.

## Current object model

- `Registry`
  - Shared object created in module `init`.
  - Tracks `total_requests`.
- `RescueRequest`
  - Shared object per rescue contract.
  - Holds requester/responder, mission metadata, status, and escrowed `Balance<SUI>`.

## Status codes stored on-chain

- `0` = open
- `1` = accepted
- `2` = in progress
- `3` = awaiting confirmation
- `4` = completed
- `5` = cancelled

## Events emitted

- `RegistryCreated`
- `RequestCreated`
- `RequestStatusChanged`
- `RequestSettled`

These are the right hooks for replacing the local mirror with an indexed read model later.

## Live testnet deployment

The package is now live on Sui testnet.

- Deployment record: [testnet.json](/Users/mondyzy/projects/web3/sui/eve_frontier_hackathon/contracts/response-network/deployments/testnet.json)
- Package id: `0x49fa5c1a7bc586d9a733b5eea5fc264d4f40fa1e7463925ee6f5c14448eeaa99`
- Registry id: `0x46dbf80c58d61fae8bb68bd3e9d12ae6b61e3c150f9b8043bfbe91e70f4693c4`
- Publish digest: `97PxiKcJ7kdLtNK3vaVoBEqRyocMWyFEoP5YbHmJeCWw`

## Environment binding

The frontend is expected to run with:

- `VITE_SUI_NETWORK=testnet`
- `VITE_RESPONSE_NETWORK_MODE=chain`
- `VITE_RESPONSE_NETWORK_MODULE=response_network`
- `VITE_RESPONSE_NETWORK_PACKAGE_ID=0x49fa5c1a7bc586d9a733b5eea5fc264d4f40fa1e7463925ee6f5c14448eeaa99`
- `VITE_RESPONSE_NETWORK_REGISTRY_ID=0x46dbf80c58d61fae8bb68bd3e9d12ae6b61e3c150f9b8043bfbe91e70f4693c4`

The local workspace has already been configured through `apps/web/.env.local`.

## Recommended deployment sequence

1. Review or extend the module implementation in
   [response_network.move](/Users/mondyzy/projects/web3/sui/eve_frontier_hackathon/contracts/response-network/sources/response_network.move)
   and verify it compiles against the target framework revision.
2. Publish the package to the target network selected in the frontend.
   [publish_response_network_sdk.mjs](/Users/mondyzy/projects/web3/sui/eve_frontier_hackathon/scripts/publish_response_network_sdk.mjs)
   is the working path in this environment because the stock `sui client publish` call hits a transport issue here.
3. Capture the shared registry object id from publish output.
4. Set the frontend env vars and restart the Vite app.
5. Connect a wallet with test funds and run the full request lifecycle:
   create -> accept -> in progress -> awaiting confirmation -> complete.

## What is ready today

- Wallet binding is live in the frontend.
- Adapter mode switching is live.
- Chain writes are scaffolded in the frontend through Mysten wallet signing.
- The Move package now contains the request lifecycle and escrow release/refund logic.
- The frontend can now rebuild the request board from `RequestCreated` events plus current
  `RescueRequest` object contents.
- Local mirror reads remain as a fallback when chain configuration is incomplete or RPC reads fail.
- Testnet publish is complete and the frontend can be pointed at the live package immediately.

## Next implementation tasks

1. Replace event/object polling with an indexed read model once volume justifies it.
2. Add integration tests for publish -> accept -> complete -> payout and cancel -> refund.
3. Expose the live deployment metadata in the app UI so operators can verify package and registry ids without opening source files.
