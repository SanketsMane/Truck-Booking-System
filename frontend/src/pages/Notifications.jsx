import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { toast } from "react-toastify";
import * as notificationsApi from "../api/notifications";
import { getSocket } from "../api/socket";
import { useAuth } from "../context/AuthContext";
import { describeNotification as describe } from "../utils/notificationCopy";
import { PageContainer, Row, Muted, EmptyState } from "../components/ui/Layout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { formatRelative } from "../utils/format";

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

  &:hover {
    border-color: ${({ theme }) => theme.color.borderStrong};
  }
`;

const Dot = styled.span`
  margin-top: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ theme, $unread }) => ($unread ? theme.color.accent : "transparent")};
`;

const ItemText = styled.p`
  margin: 0;
  font-size: 14.5px;
  font-weight: ${({ $unread }) => ($unread ? 700 : 500)};
  color: ${({ theme }) => theme.color.text};
`;

const ItemTime = styled.p`
  margin: 2px 0 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.color.textFaint};
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
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
      <Row style={{ justifyContent: "space-between" }} $wrap>
        {unreadCount > 0 && (
          <Button $variant="secondary" $size="sm" onClick={handleMarkAllRead} disabled={markingAll}>
            {markingAll ? "Marking…" : `Mark all read (${unreadCount})`}
          </Button>
        )}
      </Row>

      {loading ? (
        <Row style={{ justifyContent: "center", padding: "60px 0" }}>
          <Spinner $size={28} />
        </Row>
      ) : notifications.length === 0 ? (
        <EmptyState>
          <Muted>You're all caught up — no notifications yet.</Muted>
        </EmptyState>
      ) : (
        <List style={{ marginTop: 20 }}>
          {notifications.map((n) => {
            const { text } = describe(n);
            const unread = !n.readAt;
            return (
              <Item key={n._id} as="button" type="button" $unread={unread} onClick={() => handleOpen(n)}>
                <Dot $unread={unread} />
                <div>
                  <ItemText $unread={unread}>{text}</ItemText>
                  <ItemTime>{formatRelative(n.sentAt || n.createdAt)}</ItemTime>
                </div>
              </Item>
            );
          })}
        </List>
      )}
    </PageContainer>
  );
};

export default Notifications;
