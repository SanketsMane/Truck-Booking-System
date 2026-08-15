const { encrypt, decrypt } = require("./crypto");

// Bank account number / IFSC / UPI ID are real financial PII — encrypted at
// rest the same way SMS/email provider credentials are (see utils/crypto.js
// for the scheme), decrypted only when actually displaying a request to its
// owner or an admin who needs it to execute the payout. accountHolderName
// and bankName are left plain — not sensitive on their own.
const encryptPayoutDetails = ({ payoutMethod, bankDetails, upiId }) => {
  if (payoutMethod === "bank" && bankDetails) {
    return {
      bankDetails: {
        ...bankDetails,
        accountNumber: bankDetails.accountNumber ? encrypt(bankDetails.accountNumber) : undefined,
        ifscCode: bankDetails.ifscCode ? encrypt(bankDetails.ifscCode) : undefined,
      },
    };
  }
  if (payoutMethod === "upi" && upiId) {
    return { upiId: encrypt(upiId) };
  }
  return {};
};

// Accepts a Mongoose doc or a plain object; returns a plain object with the
// sensitive fields decrypted. Falls back to null instead of throwing if a
// value can't be decrypted (e.g. ENCRYPTION_KEY was rotated) rather than
// breaking the whole list response for one bad row.
const decryptPayoutDetails = (request) => {
  const plain = typeof request.toObject === "function" ? request.toObject() : { ...request };

  if (plain.bankDetails?.accountNumber) {
    try {
      plain.bankDetails.accountNumber = decrypt(plain.bankDetails.accountNumber);
    } catch {
      plain.bankDetails.accountNumber = null;
    }
  }
  if (plain.bankDetails?.ifscCode) {
    try {
      plain.bankDetails.ifscCode = decrypt(plain.bankDetails.ifscCode);
    } catch {
      plain.bankDetails.ifscCode = null;
    }
  }
  if (plain.upiId) {
    try {
      plain.upiId = decrypt(plain.upiId);
    } catch {
      plain.upiId = null;
    }
  }

  return plain;
};

module.exports = { encryptPayoutDetails, decryptPayoutDetails };
