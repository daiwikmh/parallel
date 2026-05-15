// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * OGTimesPayment
 *
 * Per-commission unlock for OG Times. User pays at least minPriceWei in OG to
 * unlock a specific commission for the calling wallet. The backend listens for
 * the Paid event and grants the wallet permanent access to that commission id.
 *
 * Designed for the 0G Galileo testnet. No external dependencies — paste into
 * Remix as-is, compile with Solidity 0.8.20+, deploy.
 */
contract OGTimesPayment {
    address public owner;
    uint256 public minPriceWei = 0.01 ether; // 0.01 OG default

    event Paid(
        address indexed user,
        bytes32 indexed commissionIdHash,
        string commissionId,
        uint256 amount,
        uint256 paidAt
    );
    event Withdrawn(address indexed to, uint256 amount);
    event PriceUpdated(uint256 newPriceWei);
    event OwnerTransferred(address indexed previousOwner, address indexed newOwner);

    error PaymentTooLow(uint256 sent, uint256 required);
    error NotOwner();
    error WithdrawFailed();
    error EmptyCommissionId();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnerTransferred(address(0), msg.sender);
    }

    /**
     * Pay to unlock a commission. Pass the commission's string id (e.g.
     * "c_xofzzw7r_mp7bt968"). Send at least minPriceWei OG with the call.
     *
     * Emits Paid with both the keccak256 hash (indexed, for cheap filtering)
     * and the original string (for the backend listener to act on).
     */
    function pay(string calldata commissionId) external payable {
        if (bytes(commissionId).length == 0) revert EmptyCommissionId();
        if (msg.value < minPriceWei) revert PaymentTooLow(msg.value, minPriceWei);
        emit Paid(
            msg.sender,
            keccak256(bytes(commissionId)),
            commissionId,
            msg.value,
            block.timestamp
        );
    }

    function setMinPrice(uint256 newPriceWei) external onlyOwner {
        minPriceWei = newPriceWei;
        emit PriceUpdated(newPriceWei);
    }

    function withdraw(address payable to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = address(this).balance;
        (bool ok, ) = to.call{value: bal}("");
        if (!ok) revert WithdrawFailed();
        emit Withdrawn(to, bal);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address prev = owner;
        owner = newOwner;
        emit OwnerTransferred(prev, newOwner);
    }

    receive() external payable {
        // Accept direct sends; treat as a tip with empty commission id.
        emit Paid(msg.sender, bytes32(0), "", msg.value, block.timestamp);
    }
}
