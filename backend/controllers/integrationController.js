const PlatformSetting = require("../models/platformSettingModel");
const smsProvider = require("../utils/smsProvider");
const emailProvider = require("../utils/emailProvider");
const kycProvider = require("../utils/kycProvider");
const { decrypt } = require("../utils/crypto");
const { logAdminAction } = require("../utils/audit");
const sendServerError = require("../utils/sendServerError");
const {
  updateSmsValidation,
  updateEmailValidation,
  updateKycValidation,
  testSmsValidation,
  testEmailValidation,
} = require("../validators/integrationValidation");

// Never echo a real secret back to the client — show which fields are set
// and a short masked hint (last 4 characters) so an admin can recognize
// "yes that's the right key" without the full value ever leaving the server
// again after it's saved.
const maskConfig = (config = {}) => {
  const masked = {};
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined || value === null || value === "") {
      masked[key] = "";
    } else if (typeof value === "string" && value.length > 4) {
      masked[key] = `${"•".repeat(Math.min(value.length - 4, 12))}${value.slice(-4)}`;
    } else if (typeof value === "object") {
      masked[key] = value; // headers/etc — not secret material itself
    } else {
      masked[key] = "••••";
    }
  }
  return masked;
};

const getIntegrations = async (req, res) => {
  try {
    const settings = await PlatformSetting.getSettings();

    const smsConfig = settings.sms?.encryptedConfig ? JSON.parse(decrypt(settings.sms.encryptedConfig)) : {};
    const emailConfig = settings.email?.encryptedConfig ? JSON.parse(decrypt(settings.email.encryptedConfig)) : {};
    const kycConfig = settings.kyc?.encryptedConfig ? JSON.parse(decrypt(settings.kyc.encryptedConfig)) : {};

    res.status(200).json({
      success: true,
      integrations: {
        sms: {
          provider: settings.sms?.provider || "console",
          // encryptedConfig gets (re)written on every save, including a
          // save that reverts back to the no-op "console"/"none" provider
          // — configured has to mean "a real provider is active", not
          // "some config blob was saved at some point".
          configured: Boolean(settings.sms?.encryptedConfig) && settings.sms?.provider !== "console",
          config: maskConfig(smsConfig),
          updatedAt: settings.sms?.updatedAt,
        },
        email: {
          provider: settings.email?.provider || "console",
          configured: Boolean(settings.email?.encryptedConfig) && settings.email?.provider !== "console",
          config: maskConfig(emailConfig),
          updatedAt: settings.email?.updatedAt,
        },
        kyc: {
          provider: settings.kyc?.provider || "manual",
          configured: Boolean(settings.kyc?.encryptedConfig) && settings.kyc?.provider !== "manual",
          config: maskConfig(kycConfig),
          updatedAt: settings.kyc?.updatedAt,
        },
      },
    });
  } catch (error) {
    sendServerError(res, error, "integrationController");
  }
};

const updateSms = async (req, res) => {
  try {
    const { error, value } = updateSmsValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    await smsProvider.setConfig(value.provider, value.config, req.auth.id);

    await logAdminAction({
      actor: req.auth.id,
      action: "integrations.sms.update",
      targetType: "PlatformSetting",
      targetId: "global",
      after: { provider: value.provider, configured: true },
      scope: req.auth.adminScope,
    });

    res.status(200).json({ success: true, msg: "SMS provider updated" });
  } catch (error) {
    sendServerError(res, error, "integrationController");
  }
};

const updateEmail = async (req, res) => {
  try {
    const { error, value } = updateEmailValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    await emailProvider.setConfig(value.provider, value.config, req.auth.id);

    await logAdminAction({
      actor: req.auth.id,
      action: "integrations.email.update",
      targetType: "PlatformSetting",
      targetId: "global",
      after: { provider: value.provider, configured: true },
      scope: req.auth.adminScope,
    });

    res.status(200).json({ success: true, msg: "Email provider updated" });
  } catch (error) {
    sendServerError(res, error, "integrationController");
  }
};

const updateKyc = async (req, res) => {
  try {
    const { error, value } = updateKycValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    await kycProvider.setConfig(value.provider, value.config, req.auth.id);

    await logAdminAction({
      actor: req.auth.id,
      action: "integrations.kyc.update",
      targetType: "PlatformSetting",
      targetId: "global",
      after: { provider: value.provider, configured: true },
      scope: req.auth.adminScope,
    });

    res.status(200).json({ success: true, msg: "KYC provider updated" });
  } catch (error) {
    sendServerError(res, error, "integrationController");
  }
};

// Tests against whatever is currently SAVED — an admin should save first,
// then test, so what's tested is exactly what OTPs/notifications will use.
const testSms = async (req, res) => {
  try {
    const { error, value } = testSmsValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { provider, config } = await smsProvider.getConfig();
    if (provider === "console") {
      return res.status(400).json({ success: false, msg: "Save a real SMS provider before testing" });
    }

    await smsProvider.sendTestSms(value.mobile, provider, config);
    res.status(200).json({ success: true, msg: `Test SMS sent to ${value.mobile}` });
  } catch (error) {
    res.status(502).json({ success: false, msg: `Test send failed: ${error.message}` });
  }
};

const testEmail = async (req, res) => {
  try {
    const { error, value } = testEmailValidation.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, msg: error.details[0].message });
    }

    const { provider, config } = await emailProvider.getConfig();
    if (provider === "console") {
      return res.status(400).json({ success: false, msg: "Save a real email provider before testing" });
    }

    await emailProvider.sendTestEmail(value.to, provider, config);
    res.status(200).json({ success: true, msg: `Test email sent to ${value.to}` });
  } catch (error) {
    res.status(502).json({ success: false, msg: `Test send failed: ${error.message}` });
  }
};

module.exports = {
  getIntegrations,
  updateSms,
  updateEmail,
  updateKyc,
  testSms,
  testEmail,
};
