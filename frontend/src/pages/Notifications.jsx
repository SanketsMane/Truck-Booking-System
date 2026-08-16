import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import {
  Bell,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Truck as TruckIcon,
  Star,
  MessageSquare,
  Route as RouteIcon,
  ShieldCheck,
  UserCog,
  ScrollText,
  CheckCheck,
} from "lucide-react";
import * as notificationsApi from "../api/notifications";
import { getSocket } from "../api/socket";
import { useAuth } from "../context/AuthContext";
import { describeNotification as describe } from "../utils/notificationCopy";
import { PageContainer, Stack, Row, Muted, EmptyState } from "../components/ui/Layout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { formatRelative } from "../utils/format";
import { fadeInUp } from "../theme/animations";

// Maps a notification's `type` to a representative icon for quick visual
// scanning — purely presentational (the copy + link target stay owned by
// notificationCopy.js, shared with AuthContext's live-arrival toast).
// Falls back to a plain bell for any type not special-cased here.
const ICON_BY_TYPE = {
  new_booking_request: Package,
  booking_confirmed: CheckCircle2,
  booking_rejected: XCircle,
  booking_expired: Clock,
  booking_cancelled: Ban,
  booking_pickup_confirmed: Package,
  booking_completed: CheckCircle2,
  rating_prompt: Star,
  new_rating: Star,
  new_chat_message: MessageSquare,
  saved_search_match: RouteIcon,
  truck_status_changed: TruckIcon,
  verification_status_changed: ShieldCheck,
  account_status_changed: UserCog,
  dispute_raised: ScrollText,
  dispute_resolved: ScrollText,
};
const iconForType = (type) => ICON_BY_TYPE[type] || Bell;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
`;

const Item = styled(Card)`
  cursor: pointer;
  padding: ${({ theme }) => theme.space(4)};
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space(3)};
  border-color: ${({ theme, $unread }) => ($unread ? theme.color.accent : theme.color.border)};
  background: ${({ theme, $unread }) => ($unread ? theme.color.accentSoft : theme.color.surface)};
  width: 100%;
  font: inherit;
  text-align: left;
  animation: ${fadeInUp} 0.3s ease both;
  animation-delay: ${({ $i = 0 }) => Math.min($i * 0.04, 0.3)}s;

  &:hover {
    border-color: ${({ theme }) => theme.color.borderStrong};
    transform: translateY(-1px);
  }
`;

const IconWrap = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme, $unread }) => ($unread ? theme.color.accent : theme.color.surfaceRaised)};
  color: ${({ theme, $unread }) => ($unread ? theme.color.onAccent : theme.color.textFaint)};
`;

const ItemBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemText = styled.p`
  margin: 0;
  font-size: 14.5px;
  font-weight: ${({ $unread }) => ($unread ? 700 : 500)};
  color: ${({ theme }) => theme.color.text};
`;

const ItemTime = styled.p`
  margin: 3px 0 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textFaint};
`;

const UnreadDot = styled.span`
  margin-top: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ theme }) => theme.color.accent};
`;

export const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const navigate = useNavigate();
  const { clearUnreadCount, decrementUnreadCount } = useAuth();

  const load = async () => {
    try {
      const { notifications } = await notificationsApi.listMyNotifications();
      setNotifications(notifications);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
    })();

    // Live updates while this page is open — the same event the navbar
    // badge listens for (see AuthContext) — rather than only reflecting
    // what was true at mount time.
    const socket = getSocket();
    const handleNewNotification = () => {
      if (!cancelled) load();
    };
    socket?.on("notification:new", handleNewNotification);

    return () => {
      cancelled = true;
      socket?.off("notification:new", handleNewNotification);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handleOpen = async (n) => {
    const { to } = describe(n);
    if (!n.readAt) {
      setNotifications((prev) =>
        prev.map((x) => (x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x))
      );
      decrementUnreadCount();
      try {
        await notificationsApi.markNotificationRead(n._id);
      } catch {
        // non-fatal — the read state will settle next time the list loads
      }
    }
    if (to) navigate(to);
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      clearUnreadCount();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <PageContainer>
      <Stack $gap={4}>
        {unreadCount > 0 && (
          <Row style={{ justifyContent: "flex-end" }}>
            <Button $variant="secondary" $size="sm" onClick={handleMarkAllRead} disabled={markingAll}>
              <CheckCheck size={15} strokeWidth={2.2} />
              {markingAll ? "Marking…" : `Mark all read (${unreadCount})`}
            </Button>
          </Row>
        )}

        {loading ? (
          <Row style={{ justifyContent: "center", padding: "60px 0" }}>
            <Spinner $size={28} />
          </Row>
        ) : notifications.length === 0 ? (
          <EmptyState>
            <Bell size={26} strokeWidth={1.6} />
            <Muted>You're all caught up — no notifications yet.</Muted>
          </EmptyState>
        ) : (
          <List>
            {notifications.map((n, i) => {
              const { text } = describe(n);
              const unread = !n.readAt;
              const Icon = iconForType(n.type);
              return (
                <Item key={n._id} as="button" type="button" $unread={unread} $i={i} onClick={() => handleOpen(n)}>
                  <IconWrap $unread={unread}>
                    <Icon size={18} strokeWidth={2.2} />
                  </IconWrap>
                  <ItemBody>
                    <ItemText $unread={unread}>{text}</ItemText>
                    <ItemTime>{formatRelative(n.sentAt || n.createdAt)}</ItemTime>
                  </ItemBody>
                  {unread && <UnreadDot />}
                </Item>
              );
            })}
          </List>
        )}
      </Stack>
    </PageContainer>
  );
};

export default Notifications;
