import { useState } from "react";
import styled from "styled-components";
import { Card } from "./Card";
import { Button } from "./Button";
import { Field, Textarea } from "./Form";
import { Stack, Row, SectionTitle, Muted } from "./Layout";
import { fadeIn, scaleIn } from "../../theme/animations";

// Shared confirm step for destructive/reason-required admin actions (suspend,
// ban, deactivate, force-cancel, reject) — one component so every admin page
// that needs "are you sure, and why" looks and behaves the same way.

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(20, 21, 15, 0.45);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
  animation: ${fadeIn} 0.15s ease;
`;

const ModalCard = styled(Card)`
  width: 100%;
  max-width: 420px;
  animation: ${scaleIn} 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
`;

export const ConfirmModal = ({
  open,
  title,
  description,
  requireReason = false,
  reasonLabel = "Reason",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  submitting = false,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState("");

  if (!open) return null;

  const reasonMissing = requireReason && !reason.trim();

  const handleConfirm = () => {
    if (reasonMissing) return;
    onConfirm(reason.trim());
    setReason("");
  };

  const handleCancel = () => {
    setReason("");
    onCancel();
  };

  return (
    <Overlay onClick={submitting ? undefined : handleCancel}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <Stack $gap={3}>
          <Stack $gap={1}>
            <SectionTitle>{title}</SectionTitle>
            {description && <Muted>{description}</Muted>}
          </Stack>
          {requireReason && (
            <Field label={reasonLabel} help="Required — this is shown to the affected user.">
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </Field>
          )}
          <Row $gap={2} style={{ justifyContent: "flex-end" }}>
            <Button type="button" $variant="ghost" onClick={handleCancel} disabled={submitting}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              $variant={danger ? "danger" : "primary"}
              onClick={handleConfirm}
              disabled={submitting || reasonMissing}
            >
              {submitting ? "Working…" : confirmLabel}
            </Button>
          </Row>
        </Stack>
      </ModalCard>
    </Overlay>
  );
};

export default ConfirmModal;
