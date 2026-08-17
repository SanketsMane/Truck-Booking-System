const Joi = require("joi");
const { normalizeRegNumber, REG_NUMBER_PATTERN } = require("../utils/regNumber");

const documentItem = Joi.object({
  docType: Joi.string().valid("rc", "insurance", "permit").required(),
  fileId: Joi.string().hex().length(24).required(),
});

const photoItem = Joi.object({
  fileId: Joi.string().hex().length(24).required(),
});

// Normalizes (strips spaces/hyphens, uppercases) and format-checks in one
// pass, so the value returned by .validate() — not just req.body — is what
// the controller's duplicate check and the eventual Truck.create() see.
const regNumberSchema = Joi.string()
  .trim()
  .required()
  .custom((value, helpers) => {
    const normalized = normalizeRegNumber(value);
    if (!REG_NUMBER_PATTERN.test(normalized)) {
      return helpers.error("regNumber.invalid");
    }
    return normalized;
  })
  .messages({
    "regNumber.invalid": "Enter a valid vehicle registration number (e.g. DL01AB1234)",
  });

const registerTruckValidation = Joi.object({
  regNumber: regNumberSchema,
  truckType: Joi.string().trim().required(),
  bodyType: Joi.string().trim().allow(""),
  totalCapacity: Joi.number().positive().required(),
  documents: Joi.array().items(documentItem).default([]),
  photos: Joi.array().items(photoItem).default([]),
});

const updateTruckValidation = Joi.object({
  truckType: Joi.string().trim(),
  bodyType: Joi.string().trim().allow(""),
  totalCapacity: Joi.number().positive(),
});

const addDocumentsValidation = Joi.object({
  documents: Joi.array().items(documentItem).min(1).required(),
});

const addPhotosValidation = Joi.object({
  photos: Joi.array().items(photoItem).min(1).required(),
});

const reviewTruckValidation = Joi.object({
  status: Joi.string().valid("verified", "rejected").required(),
  reason: Joi.string().trim().when("status", {
    is: "rejected",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

module.exports = {
  registerTruckValidation,
  updateTruckValidation,
  addDocumentsValidation,
  addPhotosValidation,
  reviewTruckValidation,
};
