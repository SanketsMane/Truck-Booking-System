const Joi = require("joi");

// A message needs text, an image, or both. text is allowed to be an empty
// string (rather than required-when-present) because an image-only send
// from the UI still includes a `text` key — it's just empty — so the
// "at least one of the two" rule has to be enforced by the custom check
// below rather than by min(1) alone, or a real image-only message with
// text: "" would fail validation despite having a valid image attached.
const sendMessageValidation = Joi.object({
  text: Joi.string().trim().max(2000).allow(""),
  imageUrl: Joi.string()
    .trim()
    .pattern(/^\/files\/[a-f0-9]{24}$/)
    .messages({ "string.pattern.base": "imageUrl must be a valid uploaded file reference" }),
})
  .custom((value, helpers) => {
    const hasText = Boolean(value.text && value.text.trim().length > 0);
    if (!hasText && !value.imageUrl) {
      return helpers.error("any.custom");
    }
    return value;
  })
  .messages({ "any.custom": '"text" or "imageUrl" is required' });

module.exports = { sendMessageValidation };
