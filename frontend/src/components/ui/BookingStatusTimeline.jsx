import styled from "styled-components";
import { Check, Send, ThumbsUp, Truck, PackageCheck, Ban } from "lucide-react";
import { fadeIn } from "../../theme/animations";

// The booking lifecycle's happy path, in order. `ongoing` covers "picked up,
// in transit" as one visual step — the app doesn't have a separate
// mid-transit status, so a finer-grained step here would imply progress
// the data can't actually back up.
const STEPS = [
  { key: "pending", label: "Requested", icon: Send },
  { key: "confirmed", label: "Confirmed", icon: ThumbsUp },
  { key: "ongoing", label: "Picked up", icon: Truck },
  { key: "completed", label: "Delivered", icon: PackageCheck },
];

const TERMINAL_COPY = {
  rejected: "This booking request was rejected.",
  cancelled: "This booking was cancelled.",
  expired: "This booking request expired without a response.",
};

const Wrap = styled.div`
  display: flex;
  align-items: flex-start;
  animation: ${fadeIn} ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.easing} both;
`;

const StepWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 0;
`;

const StepRow = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
`;

const Dot = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  transition: background ${({ theme }) => theme.motion.base}, border-color ${({ theme }) => theme.motion.base};
  color: ${({ theme, $state }) => ($state === "upcoming" ? theme.color.textFaint : theme.color.onAccent)};
  background: ${({ theme, $state }) =>
    $state === "upcoming" ? theme.color.surfaceRaised : theme.color.accent};
  border: 2px solid ${({ theme, $state }) => ($state === "upcoming" ? theme.color.border : theme.color.accent)};
`;

const Connector = styled.div`
  flex: 1;
  height: 2px;
  background: ${({ theme, $filled }) => ($filled ? theme.color.accent : theme.color.border)};
  transition: background ${({ theme }) => theme.motion.base};
`;

const StepLabel = styled.div`
  margin-top: 8px;
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: ${({ theme, $state }) => ($state === "upcoming" ? theme.font.weight.medium : theme.font.weight.bold)};
  color: ${({ theme, $state }) => ($state === "upcoming" ? theme.color.textFaint : theme.color.text)};
  text-align: center;
`;

const TerminalBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.dangerSoft};
  color: ${({ theme }) => theme.color.danger};
  font-size: ${({ theme }) => theme.font.size.sm};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  animation: ${fadeIn} ${({ theme }) => theme.motion.base} ${({ theme }) => theme.motion.easing} both;
`;

// A stepper implies forward progress — rejected/cancelled/expired bookings
// left the happy path entirely, so they get a plain terminal banner instead
// of a stepper stuck mid-way or forced onto a step that never really
// completed.
export const BookingStatusTimeline = ({ status }) => {
  if (TERMINAL_COPY[status]) {
    return (
      <TerminalBanner>
        <Ban size={16} strokeWidth={2.4} />
        {TERMINAL_COPY[status]}
      </TerminalBanner>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <Wrap>
      {STEPS.map((step, i) => {
        const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming";
        const Icon = state === "done" ? Check : step.icon;
        return (
          <StepWrap key={step.key}>
            <StepRow>
              {i > 0 && <Connector $filled={i <= currentIndex} />}
              <Dot $state={state}>
                <Icon size={15} strokeWidth={2.6} />
              </Dot>
              {i < STEPS.length - 1 && <Connector $filled={i < currentIndex} />}
            </StepRow>
            <StepLabel $state={state}>{step.label}</StepLabel>
          </StepWrap>
        );
      })}
    </Wrap>
  );
};

export default BookingStatusTimeline;
