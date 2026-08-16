import { useEffect, useRef } from "react";
import styled from "styled-components";
import { X, MapPin, Star } from "lucide-react";
import { Card } from "../ui/Card";
import { Avatar } from "../ui/Avatar";
import { Stack, Row, Muted } from "../ui/Layout";
import ReviewList from "../ReviewList";
import { fadeIn, scaleIn } from "../../theme/animations";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(20, 21, 15, 0.45);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
  z-index: 100;
  padding: 40px 16px;
  animation: ${fadeIn} 0.15s ease;
`;

const ModalCard = styled(Card)`
  width: 100%;
  max-width: 480px;
  animation: ${scaleIn} 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);

  &:focus {
    outline: none;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: ${({ theme }) => theme.color.textMuted};

  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
    color: ${({ theme }) => theme.color.text};
  }
`;

const Name = styled.div`
  font-size: 19px;
  font-weight: 800;
  color: ${({ theme }) => theme.color.text};
`;

const RoleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 3px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  text-transform: capitalize;
  color: ${({ theme }) => theme.color.accentStrong};
  background: ${({ theme }) => theme.color.accentSoft};
`;

// Lightweight "who am I talking to" view surfaced from chat — no dedicated
// public-profile route exists elsewhere in the app, so this reuses the same
// safe field set already shown on trip search results/booking detail
// (name, city, rating, roles) plus the existing ReviewList, rather than
// exposing anything new (mobile/email/documents stay private).
export const UserProfileModal = ({ open, person, onClose }) => {
  const cardRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement;
    cardRef.current?.focus();
    return () => previouslyFocused.current?.focus?.();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !person) return null;

  return (
    <Overlay onClick={onClose}>
      <ModalCard
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-name"
        style={{ position: "relative" }}
        onClick={(e) => e.stopPropagation()}
      >
        <CloseButton type="button" onClick={onClose} aria-label="Close">
          <X size={16} strokeWidth={2.4} />
        </CloseButton>

        <Stack $gap={5}>
          <Row $gap={3}>
            <Avatar name={person.name} size={56} />
            <Stack $gap={1}>
              <Name id="profile-modal-name">{person.name || "—"}</Name>
              <Row $gap={2} $wrap>
                {person.city && (
                  <Muted style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={13} strokeWidth={2.2} />
                    {person.city}
                  </Muted>
                )}
                <Muted style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Star size={13} strokeWidth={2.2} />
                  {person.ratingAvg > 0
                    ? `${person.ratingAvg.toFixed(1)}${person.ratingCount ? ` (${person.ratingCount})` : ""}`
                    : "No ratings yet"}
                </Muted>
              </Row>
              {person.roles?.length > 0 && (
                <Row $gap={1} $wrap>
                  {person.roles.map((r) => (
                    <RoleBadge key={r}>{r}</RoleBadge>
                  ))}
                </Row>
              )}
            </Stack>
          </Row>

          <ReviewList userId={person._id} title="Reviews" />
        </Stack>
      </ModalCard>
    </Overlay>
  );
};

export default UserProfileModal;
