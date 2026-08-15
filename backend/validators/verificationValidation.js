const Joi = require("joi");

const submitVerificationValidation = Joi.object({
  type: Joi.string().valid("shipper", "transporter").required(),
  businessName: Joi.string().trim().allow(""),
  documents: Joi.array()
    .items(
      Joi.object({
        docType: Joi.string().trim().required(),
        fileId: Joi.string().hex().length(24).required(),
      })
    )
    .min(1)
    .required(),
});

const reviewVerificationValidation = Joi.object({
  status: Joi.string().valid("verified", "rejected").required(),
  reason: Joi.string().trim().when("status", {
    is: "rejected",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

module.exports = { submitVerificationValidation, reviewVerificationValidation };
