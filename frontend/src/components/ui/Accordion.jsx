import { useEffect, useId, useRef, useState } from "react";
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

// One FAQ entry. `id` is the stable anchor other pages deep-link to
// (e.g. Home's FAQ teaser links to `/help#cancellation-policy`) — on
// mount, if the URL hash matches, the item opens itself and scrolls into
// view, so a deep link actually lands the visitor on an open answer
// instead of a collapsed page.
export const AccordionItem = ({ id, question, children, defaultOpen = false }) => {
  // Lazy initializer, checked once against whatever hash was present when
  // this page first mounted — a deep link (Home's FAQ teaser links to
  // e.g. /help#cancellation-policy) opens straight to the right answer
  // instead of landing on a collapsed page.
  const [open, setOpen] = useState(
    () => defaultOpen || (typeof window !== "undefined" && Boolean(id) && window.location.hash === `#${id}`)
  );
  const panelId = useId();
  const ref = useRef(null);

  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: "start" });
    // Only the initial-mount scroll matters here — toggling the item open
    // later via a click shouldn't yank the page's scroll position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Item id={id} ref={ref}>
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
