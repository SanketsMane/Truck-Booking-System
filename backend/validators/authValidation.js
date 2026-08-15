const Joi = require("joi");
const { PASSWORD_MIN_LENGTH } = require("../config/authConfig");

const mobileSchema = Joi.string()
  .pattern(/^[6-9]\d{9}$/)
  .required()
  .messages({ "string.pattern.base": "Enter a valid 10-digit Indian mobile number" });

const passwordSchema = Joi.string().min(PASSWORD_MIN_LENGTH).required().messages({
  "string.min": `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
});

const requestOtpValidation = Joi.object({
  mobile: mobileSchema,
});

const verifyOtpValidation = Joi.object({
  mobile: mobileSchema,
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
  name: Joi.string().trim().min(1),
  email: Joi.string().trim().lowercase().email(),
  city: Joi.string().trim(),
  roles: Joi.array().items(Joi.string().valid("shipper", "transporter")),
});

const addRoleValidation = Joi.object({
  role: Joi.string().valid("shipper", "transporter").required(),
});

const updateProfileValidation = Joi.object({
  name: Joi.string().trim().min(1),
  email: Joi.string().trim().lowercase().email().allow(""),
  city: Joi.string().trim().allow(""),
  profilePhoto: Joi.string().trim().allow(""),
  notificationPreferences: Joi.object().pattern(Joi.string(), Joi.boolean()),
});

const signupValidation = Joi.object({
  name: Joi.string().trim().min(1).required(),
  mobile: mobileSchema,
  email: Joi.string().trim().lowercase().email().required(),
  password: passwordSchema,
  confirmPassword: Joi.any().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
  }),
  roles: Joi.array().items(Joi.string().valid("shipper", "transporter")),
});

const loginPasswordValidation = Joi.object({
  identifier: Joi.string().trim().required().messages({
    "string.empty": "Enter your email or mobile number",
  }),
  password: Joi.string().required(),
});

const forgotPasswordValidation = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
});

const resetPasswordValidation = Joi.object({
  token: Joi.string().trim().required(),
  password: passwordSchema,
  confirmPassword: Joi.any().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
  }),
});

const setPasswordValidation = Joi.object({
  currentPassword: Joi.string().allow(""),
  newPassword: passwordSchema,
  confirmPassword: Joi.any().valid(Joi.ref("newPassword")).required().messages({
    "any.only": "Passwords do not match",
  }),
});

module.exports = {
  requestOtpValidation,
  verifyOtpValidation,
  addRoleValidation,
  updateProfileValidation,
  signupValidation,
  loginPasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  setPasswordValidation,
};
