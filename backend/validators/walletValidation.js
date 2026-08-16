const Joi = require("joi");

const rechargeOrderValidation = Joi.object({
  amount: Joi.number().positive().min(10).max(100000).required(),
});

const razorpayVerifyValidation = Joi.object({
  razorpay_order_id: Joi.string().trim().required(),
  razorpay_payment_id: Joi.string().trim().required(),
  razorpay_signature: Joi.string().trim().required(),
});

// Shared by withdrawalRequestValidation and payoutMethodValidation — same
// "payoutMethod picks which of bankDetails/upiId is required/forbidden"
// shape either way; only whether payoutMethod itself is required differs
// (a request can omit it entirely to fall back to the saved default, but
// explicitly saving a payout method always needs one).
const payoutFields = {
  payoutMethod: Joi.string().valid("bank", "upi"),
  bankDetails: Joi.object({
    accountHolderName: Joi.string().trim().required(),
    accountNumber: Joi.string().trim().required(),
    ifscCode: Joi.string().trim().required(),
    bankName: Joi.string().trim().allow(""),
  }).when("payoutMethod", { is: "bank", then: Joi.required(), otherwise: Joi.forbidden() }),
  upiId: Joi.string()
    .trim()
    .when("payoutMethod", { is: "upi", then: Joi.required(), otherwise: Joi.forbidden() }),
};

// payoutMethod is optional here — omitting it (along with bankDetails/upiId)
// means "use my saved payout method" (see walletController.requestWithdrawal).
const withdrawalRequestValidation = Joi.object({
  amount: Joi.number().positive().required(),
  ...payoutFields,
});

// Saving a payout method is always an explicit, complete replace.
const payoutMethodValidation = Joi.object({
  ...payoutFields,
  payoutMethod: payoutFields.payoutMethod.required(),
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
  payoutMethodValidation,
  rejectWithdrawalValidation,
  markWithdrawalPaidValidation,
  adjustWalletValidation,
};
