// A plain x.y.z comparison — not a full semver range resolver, since the
// only thing this ever compares is "is my installed version at least this
// floor" (backend/models/platformSettingModel.js's mobile.minSupportedVersion).
export const isVersionAtLeast = (version, minVersion) => {
  const a = String(version).split(".").map(Number);
  const b = String(minVersion).split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff > 0;
  }
  return true;
};
