

# Add MinimalForwarder.sol Contract

## What This Does
Adds the OpenZeppelin MinimalForwarder companion contract to the `contracts/` directory. This is the trusted forwarder that enables gasless transactions — it verifies user signatures and forwards calls to TrustLockEscrow so the TrustLock Relayer pays all gas fees.

## Implementation

**Create `contracts/MinimalForwarder.sol`** — a standard OpenZeppelin ERC-2771 forwarder using Solidity ^0.8.20 (matching the existing contracts). The contract:
- Inherits from `@openzeppelin/contracts/metatx/ERC2771Forwarder.sol` (the current OZ v5 standard, replacing the deprecated `MinimalForwarder`)
- Accepts a constructor parameter for the forwarder name (used in EIP-712 domain separator)
- Provides `execute()` and `executeBatch()` for single and batched meta-transactions
- Validates EIP-712 typed signatures and nonces to prevent replay attacks

Since the project uses OpenZeppelin v5 (`^0.8.20` pragma + OZ imports like `Ownable`, `ReentrancyGuard`), the correct import is `ERC2771Forwarder` rather than the legacy `MinimalForwarder` from OZ v4.

## Single File Change
- **New file:** `contracts/MinimalForwarder.sol` (~15 lines) — thin wrapper around OpenZeppelin's standard forwarder

