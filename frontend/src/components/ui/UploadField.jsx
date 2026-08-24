import styled from "styled-components";
import { ImagePlus } from "lucide-react";
import { Stack, Muted } from "./Layout";

// An upload target for a single image (logo/favicon/cover image, etc.) —
// click to pick a file, uploads immediately (isPublic:true — this is for a
// PUBLIC-facing image, never a private KYC document), shows an instant
// local preview via createObjectURL before the network round-trip even
// resolves. Originally written for the admin Settings branding card
// (logo/favicon); extracted here once PostEditor.jsx needed the exact same
// upload-tile UI for a post's cover image, so both share one implementation
// instead of a copy-pasted fork.
// Exported (not module-private) — the admin Settings favicon field builds
// its own custom preview (a mock browser tab) via UploadField's
// renderPreview escape hatch, and reuses this exact tile shell inside it
// rather than duplicating the dashed-border/hover styling.
export const UploadTile = styled.label`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 96px;
  height: 96px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1.5px dashed ${({ theme, $hasImage }) => ($hasImage ? "transparent" : theme.color.border)};
  background: ${({ theme, $hasImage }) => ($hasImage ? theme.color.surface : theme.color.surfaceRaised)};
  color: ${({ theme }) => theme.color.textFaint};
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.color.accent};
    background: ${({ theme, $hasImage }) => ($hasImage ? theme.color.surface : theme.color.accentSoft)};
  }

  input {
    display: none;
  }
`;

export const UploadTileImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 8px;
`;

export const UploadOverlay = styled.span`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 21, 15, 0.55);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.15s ease;

  ${UploadTile}:hover & {
    opacity: 1;
  }
`;

const UploadHint = styled(Muted)`
  font-size: 12px;
  max-width: 150px;
`;

export const UploadField = ({ label, hint, imageSrc, uploading, onPick, renderPreview }) => (
  <Stack $gap={2} style={{ width: "auto" }}>
    {renderPreview ? (
      renderPreview(imageSrc)
    ) : (
      <UploadTile $hasImage={Boolean(imageSrc)}>
        {imageSrc ? <UploadTileImg src={imageSrc} alt={label} /> : <ImagePlus size={22} strokeWidth={1.8} />}
        <UploadOverlay>{uploading ? "Uploading…" : imageSrc ? "Replace" : "Upload"}</UploadOverlay>
        <input type="file" accept="image/jpeg,image/png" onChange={onPick} disabled={uploading} />
      </UploadTile>
    )}
    <UploadHint>
      <strong style={{ color: "inherit", display: "block", marginBottom: 2 }}>{label}</strong>
      {hint}
    </UploadHint>
  </Stack>
);

export default UploadField;
