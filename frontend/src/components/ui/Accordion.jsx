import { useId, useState } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { ChevronDown } from "lucide-react";

export const Accordion = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`;

const Item = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  scroll-margin-top: 90px;
`;

const Question = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(4)} ${({ theme }) => theme.space(1)};
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-size: ${({ theme }) => theme.font.size.md};
  font-weight: ${({ theme }) => theme.font.weight.semibold};
  color: ${({ theme }) => theme.color.text};

  &:hover {
    color: ${({ theme }) => theme.color.accent};
  }
`;

const Chevron = styled(ChevronDown)`
  flex-shrink: 0;
  color: ${({ theme }) => theme.color.textFaint};
  transition: transform 0.18s ease;
  transform: rotate(${({ $open }) => ($open ? "180deg" : "0deg")});
`;

// A plain height:0/auto toggle (no measured max-height animation) — this
// codebase doesn't have a height-animation utility yet and a FAQ panel's
// content length varies too much for a fixed max-height guess. Instant
// show/hide, not a slide — a reasonable trade for the first accordion this
// app has needed.
const Answer = styled.div`
  display: ${({ $open }) => ($open ? "block" : "none")};
  padding: 0 ${({ theme }) => theme.space(1)} ${({ theme }) => theme.space(4)};
`;

// One FAQ entry. `id` is the stable anchor other pages deep-link to (e.g.
// the footer's "Cancellation Policy" links to `/faq#cancel-my-shipment`) —
// when the URL hash matches this item's id, it opens itself. Scrolling to
// it is handled separately by the app-wide ScrollManager
// (components/ScrollManager.jsx), which works regardless of open state
// since it targets this item's own wrapper element, not its answer panel.
export const AccordionItem = ({ id, question, children, defaultOpen = false }) => {
  const location = useLocation();
  const [open, setOpen] = useState(defaultOpen);
  // Tracks which hash we've already auto-opened for, so a same-page click
  // to a *different* FAQ deep link (component doesn't remount, so a
  // mount-only check would miss it) still opens the newly-targeted item,
  // without this re-firing and re-opening one the visitor already closed.
  const [autoOpenedFor, setAutoOpenedFor] = useState(null);
  const panelId = useId();

  const hashMatches = Boolean(id) && location.hash === `#${id}`;
  if (hashMatches && autoOpenedFor !== location.hash) {
    setAutoOpenedFor(location.hash);
    setOpen(true);
  }

  return (
    <Item id={id}>
      <Question type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}>
        {question}
        <Chevron size={18} $open={open} />
      </Question>
      <Answer id={panelId} $open={open} role="region">
        {children}
      </Answer>
    </Item>
  );
};

export default Accordion;
