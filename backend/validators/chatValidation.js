const Joi = require("joi");

// A message needs text, an image, or both — .or() enforces at least one of
// the two keys is present; text, when present at all, still can't be just
// whitespace (min(1) after trim).
const sendMessageValidation = Joi.object({
  text: Joi.string().trim().min(1).max(2000),
  imageUrl: Joi.string()
    .trim()
    .pattern(/^\/files\/[a-f0-9]{24}$/)
    .messages({ "string.pattern.base": "imageUrl must be a valid uploaded file reference" }),
})
  .or("text", "imageUrl")
  .messages({ "object.missing": '"text" or "imageUrl" is required' });

module.exports = { sendMessageValidation };
