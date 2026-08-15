const Joi = require("joi");

const setUserStatusValidation = Joi.object({
  status: Joi.string().valid("active", "suspended", "banned").required(),
  reason: Joi.string().trim().when("status", {
    is: Joi.valid("suspended", "banned"),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

const forceCancelBookingValidation = Joi.object({
  reason: Joi.string().trim().required(),
});

const deactivateTripValidation = Joi.object({
  reason: Joi.string().trim().required(),
});

const updateSettingsValidation = Joi.object({
  verificationGateEnabled: Joi.boolean().required(),
});

const updateCommissionValidation = Joi.object({
  commissionPercent: Joi.number().min(0).max(100).required(),
});

const setAdminRoleValidation = Joi.object({
  isAdmin: Joi.boolean().required(),
  adminScope: Joi.string()
    .valid("full", "verification", "support", "finance")
    .when("isAdmin", { is: true, then: Joi.required(), otherwise: Joi.optional().allow(null) }),
});

module.exports = {
  setUserStatusValidation,
  forceCancelBookingValidation,
  deactivateTripValidation,
  updateSettingsValidation,
  updateCommissionValidation,
  setAdminRoleValidation,
};
