import styled from "styled-components";

// Placeholder-content warning banner — identical treatment on Terms.jsx and
// Privacy.jsx, extracted here rather than left duplicated. Deliberately
// stays on both pages: neither is real legal text reviewed by counsel, and
// presenting invented legal terms as reviewed/binding would be actively
// misleading — this banner is not decoration, it's the actual disclosure.
const NoticeBox = styled.div`
  border: 1px solid ${({ theme }) => theme.color.warning};
  background: ${({ theme }) => theme.color.warningSoft};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: ${({ theme }) => theme.space(4)};
  color: ${({ theme }) => theme.color.text};
  font-size: 14px;
  line-height: 1.5;
`;

export const LegalNotice = ({ children }) => <NoticeBox role="note">{children}</NoticeBox>;

export default LegalNotice;
