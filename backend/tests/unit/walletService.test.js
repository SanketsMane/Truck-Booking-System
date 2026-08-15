const mongoose = require("mongoose");
const { applyWalletEntry, withWalletSession, InsufficientBalanceError } = require("../../utils/walletService");
const Wallet = require("../../models/walletModel");

const userId = () => new mongoose.Types.ObjectId();

describe("walletService", () => {
  it("credits a wallet, creating it on first use", async () => {
    const uid = userId();
    const { wallet, transaction } = await applyWalletEntry({
      walletFilter: { ownerType: "user", user: uid },
      amount: 100,
      direction: "credit",
      type: "adjustment",
    });
    expect(wallet.balance).toBe(100);
    expect(transaction.direction).toBe("credit");
    expect(transaction.balanceAfter).toBe(100);
  });

  it("debits a sufficiently-funded wallet", async () => {
    const uid = userId();
    await applyWalletEntry({ walletFilter: { ownerType: "user", user: uid }, amount: 100, direction: "credit", type: "adjustment" });
    const { wallet } = await applyWalletEntry({
      walletFilter: { ownerType: "user", user: uid },
      amount: 40,
      direction: "debit",
      type: "adjustment",
    });
    expect(wallet.balance).toBe(60);
  });

  it("throws InsufficientBalanceError debiting a wallet that doesn't exist yet, without creating one", async () => {
    const uid = userId();
    await expect(
      applyWalletEntry({ walletFilter: { ownerType: "user", user: uid }, amount: 50, direction: "debit", type: "adjustment" })
    ).rejects.toThrow(InsufficientBalanceError);
    const wallet = await Wallet.findOne({ ownerType: "user", user: uid });
    expect(wallet).toBeNull();
  });

  it("rejects a debit that would overdraw an existing balance", async () => {
    const uid = userId();
    await applyWalletEntry({ walletFilter: { ownerType: "user", user: uid }, amount: 30, direction: "credit", type: "adjustment" });
    await expect(
      applyWalletEntry({ walletFilter: { ownerType: "user", user: uid }, amount: 31, direction: "debit", type: "adjustment" })
    ).rejects.toThrow(InsufficientBalanceError);
  });

  // The $gte-guarded findOneAndUpdate is what makes this safe, not the
  // caller — two concurrent debits for the full balance must never both
  // succeed just because they both read a sufficient balance before either
  // write landed.
  it("lets only one of two concurrent debits succeed when funds cover exactly one", async () => {
    const uid = userId();
    await applyWalletEntry({ walletFilter: { ownerType: "user", user: uid }, amount: 100, direction: "credit", type: "adjustment" });

    const attempt = () =>
      applyWalletEntry({ walletFilter: { ownerType: "user", user: uid }, amount: 100, direction: "debit", type: "adjustment" });

    const results = await Promise.allSettled([attempt(), attempt()]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(InsufficientBalanceError);

    const wallet = await Wallet.findOne({ ownerType: "user", user: uid });
    expect(wallet.balance).toBe(0);
  });

  it("withWalletSession commits multiple entries atomically", async () => {
    const uidA = userId();
    const uidB = userId();
    await applyWalletEntry({ walletFilter: { ownerType: "user", user: uidA }, amount: 100, direction: "credit", type: "adjustment" });

    await withWalletSession(async (session) => {
      await applyWalletEntry({
        walletFilter: { ownerType: "user", user: uidA },
        amount: 100,
        direction: "debit",
        type: "adjustment",
        session,
      });
      await applyWalletEntry({
        walletFilter: { ownerType: "user", user: uidB },
        amount: 100,
        direction: "credit",
        type: "adjustment",
        session,
      });
    });

    const walletA = await Wallet.findOne({ ownerType: "user", user: uidA });
    const walletB = await Wallet.findOne({ ownerType: "user", user: uidB });
    expect(walletA.balance).toBe(0);
    expect(walletB.balance).toBe(100);
  });

  it("rolls back every entry in the transaction if one of them fails", async () => {
    const uidA = userId();
    const uidB = userId();
    await applyWalletEntry({ walletFilter: { ownerType: "user", user: uidA }, amount: 50, direction: "credit", type: "adjustment" });

    await expect(
      withWalletSession(async (session) => {
        await applyWalletEntry({
          walletFilter: { ownerType: "user", user: uidA },
          amount: 50,
          direction: "debit",
          type: "adjustment",
          session,
        });
        // uidB has no wallet yet — this debit fails and must roll back uidA's debit too.
        await applyWalletEntry({
          walletFilter: { ownerType: "user", user: uidB },
          amount: 10,
          direction: "debit",
          type: "adjustment",
          session,
        });
      })
    ).rejects.toThrow(InsufficientBalanceError);

    const walletA = await Wallet.findOne({ ownerType: "user", user: uidA });
    expect(walletA.balance).toBe(50);
  });
});
