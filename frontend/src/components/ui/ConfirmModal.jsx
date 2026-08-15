import { useEffect, useRef, useState } from "react";
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

  &:focus {
    outline: none;
  }
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
  const cardRef = useRef(null);
  const previouslyFocused = useRef(null);

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

  // Moves focus into the dialog on open, restores it to whatever triggered
  // the modal on close — a modal that traps focus visually but leaves
  // keyboard/screen-reader focus behind on the page underneath is only
  // half-accessible. The reason textarea already autofocuses itself when
  // present; otherwise focus the dialog card so Tab/Escape work immediately.
  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement;
    if (!requireReason) {
      cardRef.current?.focus();
    }
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [open, requireReason]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !submitting) handleCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, submitting]);

  if (!open) return null;

  return (
    <Overlay onClick={submitting ? undefined : handleCancel}>
      <ModalCard
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <Stack $gap={3}>
          <Stack $gap={1}>
            <SectionTitle id="confirm-modal-title">{title}</SectionTitle>
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
