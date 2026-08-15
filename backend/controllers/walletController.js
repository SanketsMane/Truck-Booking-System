const Wallet = require("../models/walletModel");
const WalletTransaction = require("../models/walletTransactionModel");
const Payment = require("../models/paymentModel");
const WithdrawalRequest = require("../models/withdrawalRequestModel");
const razorpayProvider = require("../utils/razorpayProvider");
const { applyWalletEntry, withWalletSession, InsufficientBalanceError } = require("../utils/walletService");
const { finalizePayment } = require("../utils/paymentFinalizer");
const { encryptPayoutDetails, decryptPayoutDetails } = require("../utils/withdrawalCrypto");
const { getPagination, paginatedResponse } = require("../utils/paginate");
const sendServerError = require("../utils/sendServerError");
const {
  rechargeOrderValidation,
  razorpayVerifyValidation,
  withdrawalRequestValidation,
} = require("../validators/walletValidation");

const getMyWallet = async (req, res) => {
  try {
    const wallet = await Wallet.getOrCreateForUser(req.auth.id);
    res.status(200).json({ success: true, wallet });
  } catch (error) {
    sendServerError(res, error, "walletController");
  }
};

const listMyTransactions = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { user: req.auth.id };

    const [items, total] = await Promise.all([
      WalletTransaction.find(filter)
        .populate("booking", "priceEstimate")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WalletTransaction.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, ...paginatedResponse(items, total, page, limit) });
  } catch (error) {
    sendServerError(res, error, "walletController");
  }
};

const createRechargeOrder = async (req, res) => {
  try {
    const { error, value } = rechargeOrderValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const client = await razorpayProvider.getClient();
    const { config } = await razorpayProvider.getConfig();
    const amountPaise = razorpayProvider.toPaise(value.amount);

    const order = await client.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `recharge_${req.auth.id}_${Date.now()}`,
      notes: { userId: req.auth.id, purpose: "wallet_recharge" },
    });

    await Payment.create({
      user: req.auth.id,
      purpose: "wallet_recharge",
      method: "razorpay",
      amount: value.amount,
      status: "created",
      razorpayOrderId: order.id,
    });

    res.status(200).json({
      success: true,
      order: { orderId: order.id, amount: amountPaise, currency: "INR", keyId: config.keyId },
    });
  } catch (error) {
    if (/isn't configured yet/.test(error.message)) {
      return res.status(400).json({ success: false, msg: error.message });
    }
    sendServerError(res, error, "walletController");
  }
};

const verifyRecharge = async (req, res) => {
  try {
    const { error, value } = razorpayVerifyValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const payment = await Payment.findOne({
      razorpayOrderId: value.razorpay_order_id,
      user: req.auth.id,
      purpose: "wallet_recharge",
    });
    if (!payment) {
      return res.status(404).json({ success: false, msg: "No matching recharge order found" });
    }
    if (payment.status === "paid") {
      const wallet = await Wallet.getOrCreateForUser(req.auth.id);
      return res.status(200).json({ success: true, msg: "Recharge already confirmed", wallet });
    }

    const { config } = await razorpayProvider.getConfig();
    const signatureValid = razorpayProvider.verifyPaymentSignature({
      orderId: value.razorpay_order_id,
      paymentId: value.razorpay_payment_id,
      signature: value.razorpay_signature,
      keySecret: config.keySecret,
    });

    if (!signatureValid) {
      payment.status = "failed";
      payment.failureReason = "Signature verification failed";
      await payment.save();
      return res.status(400).json({ success: false, msg: "Payment verification failed" });
    }

    await finalizePayment(payment, {
      razorpayPaymentId: value.razorpay_payment_id,
      razorpaySignature: value.razorpay_signature,
      verifiedVia: "checkout",
    });

    const wallet = await Wallet.getOrCreateForUser(req.auth.id);
    res.status(200).json({ success: true, msg: "Wallet recharged", wallet });
  } catch (error) {
    sendServerError(res, error, "walletController");
  }
};

const requestWithdrawal = async (req, res) => {
  try {
    const { error, value } = withdrawalRequestValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const request = await withWalletSession(async (session) => {
      const { transaction } = await applyWalletEntry({
        walletFilter: { ownerType: "user", user: req.auth.id },
        amount: value.amount,
        direction: "debit",
        type: "withdrawal_debit",
        session,
      });

      const [withdrawalRequest] = await WithdrawalRequest.create(
        [
          {
            transporter: req.auth.id,
            amount: value.amount,
            payoutMethod: value.payoutMethod,
            bankDetails: value.bankDetails,
            upiId: value.upiId,
            ...encryptPayoutDetails(value),
            walletTransaction: transaction._id,
          },
        ],
        { session }
      );

      // Back-fill the ledger row with the request it funded — its own _id
      // wasn't known until just now (WithdrawalRequest.create needed the
      // transaction to already exist, and vice versa).
      transaction.withdrawalRequest = withdrawalRequest._id;
      await transaction.save({ session });

      return withdrawalRequest;
    });

    res
      .status(201)
      .json({ success: true, msg: "Withdrawal request submitted", request: decryptPayoutDetails(request) });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return res.status(400).json({ success: false, msg: "Insufficient wallet balance for this withdrawal" });
    }
    sendServerError(res, error, "walletController");
  }
};

const listMyWithdrawals = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { transporter: req.auth.id };

    const [items, total] = await Promise.all([
      WithdrawalRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      WithdrawalRequest.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      ...paginatedResponse(items.map(decryptPayoutDetails), total, page, limit),
    });
  } catch (error) {
    sendServerError(res, error, "walletController");
  }
};

module.exports = {
  getMyWallet,
  listMyTransactions,
  createRechargeOrder,
  verifyRecharge,
  requestWithdrawal,
  listMyWithdrawals,
};
