const mongoose = require("mongoose");
const Wallet = require("../models/walletModel");
const WalletTransaction = require("../models/walletTransactionModel");

// Thrown when a debit's $gte balance guard doesn't match — i.e. the wallet
// doesn't have enough funds. A distinct type so callers can tell this apart
// from an unexpected error and respond 400 instead of 500.
class InsufficientBalanceError extends Error {
  constructor(message = "Insufficient wallet balance") {
    super(message);
    this.name = "InsufficientBalanceError";
  }
}

// The one function every money-moving flow calls. Credits/debits a wallet
// and writes the corresponding ledger row in the same atomic step — no
// separate read before the write, so concurrent calls can never race past
// each other into an incorrect balance.
//
// walletFilter must be plain equality on {ownerType, user} (e.g.
// {ownerType:"user", user: id} or {ownerType:"platform", user:null}) — on
// credit it upserts, lazily creating the wallet on first use (Mongo
// populates the new doc's fields from the filter's equality conditions).
// On debit it's combined with a {balance: {$gte: amount}} guard, which IS
// the overdraft check: no upsert, so a missing wallet or insufficient
// balance both fail the match the same way and throw InsufficientBalanceError
// rather than silently applying a negative balance.
const applyWalletEntry = async ({ walletFilter, amount, direction, type, session, ...refs }) => {
  if (!(amount > 0)) {
    throw new Error("applyWalletEntry amount must be a positive number");
  }

  const inc = direction === "credit" ? amount : -amount;
  let wallet;
  if (direction === "credit") {
    wallet = await Wallet.findOneAndUpdate(
      walletFilter,
      { $inc: { balance: inc } },
      { new: true, upsert: true, session }
    );
  } else {
    wallet = await Wallet.findOneAndUpdate(
      { ...walletFilter, balance: { $gte: amount } },
      { $inc: { balance: inc } },
      { new: true, session }
    );
    if (!wallet) throw new InsufficientBalanceError();
  }

  const [transaction] = await WalletTransaction.create(
    [
      {
        wallet: wallet._id,
        user: wallet.user,
        type,
        direction,
        amount,
        balanceAfter: wallet.balance,
        ...refs,
      },
    ],
    { session }
  );

  return { wallet, transaction };
};

// Wraps a multi-document money movement in a real transaction. Atlas is
// always a replica set, so this is available; session.withTransaction()
// already retries TransientTransactionError/UnknownTransactionCommitResult
// per the MongoDB driver, so callers don't need their own retry loop.
const withWalletSession = async (fn) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = { applyWalletEntry, withWalletSession, InsufficientBalanceError };
