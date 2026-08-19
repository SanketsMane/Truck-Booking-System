import styled from "styled-components";
import { Select } from "./Form";

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const HourSelect = styled(Select)`
  width: auto;
  flex: 1;
`;

const MinuteSelect = styled(Select)`
  width: auto;
  flex: 1;
`;

const Colon = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.color.textMuted};
`;

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

// A guaranteed 24-hour (00:00-23:59) time picker. A native
// <input type="time"> was tried first, but its on-screen AM/PM-vs-24h
// rendering follows the browser/OS locale and can't be forced from HTML —
// it showed "03:25 PM" on a plain US-locale Chromium even with a
// "24-hour format" label right next to it, which is exactly the confusion
// this exists to prevent. Two plain <select> elements have no such
// ambiguity: the displayed value IS the stored value, on every device,
// matching how departure/arrival times are shown everywhere else in the
// app (utils/format.js's hour12:false).
//
// value/onChange are a plain "HH:MM" string, same shape a native time
// input would give — swapping this in for one is a drop-in replacement.
export const TimeInput = ({ value, onChange, id }) => {
  const [hh, mm] = (value || "00:00").split(":");
  return (
    <Row>
      <HourSelect id={id} aria-label="Hour" value={hh} onChange={(e) => onChange(`${e.target.value}:${mm}`)}>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </HourSelect>
      <Colon>:</Colon>
      <MinuteSelect aria-label="Minute" value={mm} onChange={(e) => onChange(`${hh}:${e.target.value}`)}>
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </MinuteSelect>
    </Row>
  );
};

export default TimeInput;
