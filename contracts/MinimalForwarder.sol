// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

/**
 * @title TrustLockForwarder
 * @notice Trusted forwarder for ERC-2771 gasless meta-transactions.
 *         Deploy this alongside TrustLockEscrow and pass its address
 *         as the `trustedForwarder` constructor argument.
 *
 * @dev Thin wrapper around OpenZeppelin's ERC2771Forwarder (v5).
 *      Provides execute() and executeBatch() with EIP-712 signature
 *      and nonce validation to prevent replay attacks.
 */
contract TrustLockForwarder is ERC2771Forwarder {
    constructor() ERC2771Forwarder("TrustLockForwarder") {}
}
