import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import { ChevronRight, MessagesSquare } from "lucide-react";
import { listInbox } from "../api/chat";
import { getSocket } from "../api/socket";
import { PageContainer, PageTitle, Muted, Stack, EmptyState } from "../components/ui/Layout";
import { Card } from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { SkeletonRow } from "../components/ui/Skeleton";
import { formatRelative } from "../utils/format";
import { fadeInUp } from "../theme/animations";

const List = styled(Stack).attrs({ $gap: 2 })``;

const ThreadCard = styled(Card).attrs({ $padding: "0" })`
  display: block;
  overflow: hidden;
  animation: ${fadeInUp} 0.3s ease both;
  animation-delay: ${({ $i = 0 }) => Math.min($i * 0.04, 0.3)}s;
`;

const ThreadRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => theme.space(3)} ${({ theme }) => theme.space(4)};
`;

const InfoCol = styled.div`
  flex: 1;
  min-width: 0;
`;

const TopLine = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
`;

const NameText = styled.span`
  font-weight: 700;
  font-size: 14.5px;
  color: ${({ theme }) => theme.color.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TimeText = styled.span`
  flex: none;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textFaint};
`;

const RouteText = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.color.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChevronCol = styled.div`
  display: none;
  align-items: center;
  color: ${({ theme }) => theme.color.textFaint};

  @media (min-width: ${({ theme }) => theme.breakpoint.tablet}) {
    display: flex;
  }
`;

const UnreadBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.accent};
  color: ${({ theme }) => theme.color.onAccent};
  font-size: 11.5px;
  font-weight: 700;
`;

// Conversation list — surfaces a thread once the transporter has engaged
// (replied, or approved the booking), per chatController.listInbox. Kept
// live via the same "notification:new" socket event AuthContext already
// listens on: a fresh message or a newly-confirmed booking should move/add
// a row here without waiting on a manual refresh.
export const ChatInbox = () => {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    listInbox()
      .then(({ threads }) => setThreads(threads || []))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const handler = (n) => {
      if (n.type === "new_chat_message" || n.type === "booking_confirmed") load();
    };
    socket.on("notification:new", handler);
    return () => socket.off("notification:new", handler);
  }, []);

  return (
    <PageContainer style={{ maxWidth: 780 }}>
      <Stack $gap={5}>
        <Stack $gap={1}>
          <PageTitle>Chat</PageTitle>
          <Muted>Conversations with transporters and shippers you have an active booking with.</Muted>
        </Stack>

        {loading ? (
          <List>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} $padding="0">
                <SkeletonRow />
              </Card>
            ))}
          </List>
        ) : threads.length === 0 ? (
          <EmptyState>
            <MessagesSquare size={26} strokeWidth={1.6} />
            <Muted>
              No conversations yet — once a transporter replies to a request or accepts a booking, you'll be
              able to chat with them here.
            </Muted>
          </EmptyState>
        ) : (
          <List>
            {threads.map((t, i) => (
              <ThreadCard as={Link} to={`/chat/${t._id}`} key={t._id} $i={i} $interactive>
                <ThreadRow>
                  <Avatar name={t.counterparty?.name} size={44} />
                  <InfoCol>
                    <TopLine>
                      <NameText>{t.counterparty?.name || "Unknown user"}</NameText>
                      <TimeText>{t.lastMessageAt ? formatRelative(t.lastMessageAt) : ""}</TimeText>
                    </TopLine>
                    <RouteText>
                      {t.booking?.trip ? `${t.booking.trip.fromCity} → ${t.booking.trip.toCity}` : "Booking"}
                      {!t.lastMessageAt && " · Booking confirmed"}
                    </RouteText>
                  </InfoCol>
                  {t.unreadCount > 0 && <UnreadBadge>{t.unreadCount > 9 ? "9+" : t.unreadCount}</UnreadBadge>}
                  <ChevronCol>
                    <ChevronRight size={18} strokeWidth={2.2} />
                  </ChevronCol>
                </ThreadRow>
              </ThreadCard>
            ))}
          </List>
        )}
      </Stack>
    </PageContainer>
  );
};

export default ChatInbox;
