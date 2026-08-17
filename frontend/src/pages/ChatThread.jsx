import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { ArrowLeft } from "lucide-react";
import { getThread } from "../api/chat";
import { ChatPanel } from "../components/chat/ChatPanel";
import { UserProfileModal } from "../components/chat/UserProfileModal";
import { Muted, Row } from "../components/ui/Layout";
import { Card } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { Spinner } from "../components/ui/Spinner";

// DashboardShell's top bar is a fixed 60px — subtracted so this page's chat
// panel fills exactly the remaining viewport instead of growing the page
// and pushing the composer off-screen.
const PageWrap = styled.div`
  max-width: 780px;
  margin: 0 auto;
  height: calc(100vh - 60px);
  padding: ${({ theme }) => theme.space(4)};
  display: flex;
  flex-direction: column;
  min-height: 0;

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    padding: ${({ theme }) => theme.space(5)} ${({ theme }) => theme.space(6)};
  }
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.textMuted};
  margin-bottom: ${({ theme }) => theme.space(3)};

  &:hover {
    color: ${({ theme }) => theme.color.text};
  }
`;

const HeaderCard = styled(Card)`
  flex: none;
  margin-bottom: ${({ theme }) => theme.space(3)};
`;

const CounterpartyButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  text-align: left;
  border-radius: ${({ theme }) => theme.radius.sm};

  &:hover {
    opacity: 0.85;
  }
`;

const Name = styled.div`
  font-weight: 700;
  font-size: 15px;
  color: ${({ theme }) => theme.color.text};
`;

const ChatCard = styled(Card)`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

export const ChatThread = () => {
  const { threadId } = useParams();
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getThread(threadId)
      .then(({ thread }) => {
        if (!cancelled) setThread(thread);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  return (
    <PageWrap>
      <BackLink to="/chat">
        <ArrowLeft size={15} strokeWidth={2.4} />
        All conversations
      </BackLink>

      <HeaderCard $padding="14px 18px">
        {loading ? (
          <Row style={{ justifyContent: "center", padding: "8px 0" }}>
            <Spinner $size={20} />
          </Row>
        ) : !thread ? (
          <Muted>This conversation isn't available.</Muted>
        ) : (
          <Row style={{ justifyContent: "space-between" }} $wrap>
            <CounterpartyButton type="button" onClick={() => setProfileOpen(true)}>
              <Avatar name={thread.counterparty?.name} size={40} />
              <div>
                <Name>{thread.counterparty?.name || "Unknown user"}</Name>
                <Muted>
                  {thread.booking?.trip ? `${thread.booking.trip.fromCity} → ${thread.booking.trip.toCity}` : ""}
                </Muted>
              </div>
            </CounterpartyButton>
            {thread.booking?.status && <StatusBadge status={thread.booking.status} />}
          </Row>
        )}
      </HeaderCard>

      <ChatCard>
        <ChatPanel
          threadId={threadId}
          flexFill
          emptyHint="This conversation isn't available."
          bookingStatus={thread?.booking?.status}
        />
      </ChatCard>

      <UserProfileModal open={profileOpen} person={thread?.counterparty} onClose={() => setProfileOpen(false)} />
    </PageWrap>
  );
};

export default ChatThread;
