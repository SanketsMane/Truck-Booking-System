const Joi = require("joi");

const rechargeOrderValidation = Joi.object({
  amount: Joi.number().positive().min(10).max(100000).required(),
});

const razorpayVerifyValidation = Joi.object({
  razorpay_order_id: Joi.string().trim().required(),
  razorpay_payment_id: Joi.string().trim().required(),
  razorpay_signature: Joi.string().trim().required(),
});

const withdrawalRequestValidation = Joi.object({
  amount: Joi.number().positive().required(),
  payoutMethod: Joi.string().valid("bank", "upi").required(),
  bankDetails: Joi.object({
    accountHolderName: Joi.string().trim().required(),
    accountNumber: Joi.string().trim().required(),
    ifscCode: Joi.string().trim().required(),
    bankName: Joi.string().trim().allow(""),
  }).when("payoutMethod", { is: "bank", then: Joi.required(), otherwise: Joi.forbidden() }),
  upiId: Joi.string()
    .trim()
    .when("payoutMethod", { is: "upi", then: Joi.required(), otherwise: Joi.forbidden() }),
});

const rejectWithdrawalValidation = Joi.object({
  reason: Joi.string().trim().required(),
});

const markWithdrawalPaidValidation = Joi.object({
  payoutReference: Joi.string().trim().required(),
});

const adjustWalletValidation = Joi.object({
  amount: Joi.number().positive().required(),
  direction: Joi.string().valid("credit", "debit").required(),
  reason: Joi.string().trim().required(),
});

module.exports = {
  rechargeOrderValidation,
  razorpayVerifyValidation,
  withdrawalRequestValidation,
  rejectWithdrawalValidation,
  markWithdrawalPaidValidation,
  adjustWalletValidation,
};
