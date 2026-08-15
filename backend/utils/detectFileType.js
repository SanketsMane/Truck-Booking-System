// Minimal magic-byte sniffing for the three types this app accepts. The
// client-supplied Content-Type (what multer's fileFilter checks) is fully
// attacker-controlled — this checks what the bytes actually are.
const SIGNATURES = [
  { mimeType: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mimeType: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mimeType: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
];

const detectFileType = (buffer) => {
  const match = SIGNATURES.find(
    (sig) => buffer.length >= sig.bytes.length && sig.bytes.every((byte, i) => buffer[i] === byte)
  );
  return match ? match.mimeType : null;
};

module.exports = detectFileType;
