const Joi = require("joi");

const documentItem = Joi.object({
  docType: Joi.string().valid("rc", "insurance", "permit").required(),
  fileId: Joi.string().hex().length(24).required(),
});

const photoItem = Joi.object({
  fileId: Joi.string().hex().length(24).required(),
});

const registerTruckValidation = Joi.object({
  regNumber: Joi.string().trim().min(4).required(),
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
