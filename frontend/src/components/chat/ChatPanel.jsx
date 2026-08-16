import { useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import { Check, CheckCheck, ImagePlus, X } from "lucide-react";
import { useChatThread } from "../../hooks/useChatThread";
import { uploadFile } from "../../api/files";
import { BASE_URL } from "../../api/client";
import { Muted, Row } from "../ui/Layout";
import { Input } from "../ui/Form";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";

const CenteredSpinner = ({ $size = 22 }) => (
  <Row style={{ justifyContent: "center", padding: "40px 0" }}>
    <Spinner $size={$size} />
  </Row>
);

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  ${({ $flexFill }) => $flexFill && "flex: 1;"}
`;

const ChatScroll = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  padding: 4px 2px;
  ${({ $flexFill }) => ($flexFill ? "flex: 1; min-height: 0;" : "max-height: 360px;")}
`;

const ChatBubble = styled.div`
  max-width: 78%;
  align-self: ${({ $mine }) => ($mine ? "flex-end" : "flex-start")};
  padding: 9px 13px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.4;
  background: ${({ theme, $mine }) => ($mine ? theme.color.accentSoft : theme.color.surfaceRaised)};
  border: 1px solid ${({ theme, $mine }) => ($mine ? "transparent" : theme.color.border)};
  color: ${({ theme }) => theme.color.text};
`;

const BubbleImage = styled.img`
  display: block;
  max-width: 100%;
  max-height: 260px;
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 6px;
`;

const BubbleFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
`;

const BubbleTime = styled.div`
  font-size: 11px;
  opacity: 0.6;
`;

const BubbleStatus = styled.span`
  display: inline-flex;
  color: ${({ theme, $read }) => ($read ? theme.color.accent : "inherit")};
  opacity: ${({ $read }) => ($read ? 1 : 0.55)};
`;

const ChatForm = styled.form`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  flex: none;
`;

const AttachButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.color.textMuted};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surface};
  transition: background 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.color.surfaceRaised};
    color: ${({ theme }) => theme.color.text};
  }
`;

const PendingImageRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 6px 8px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surfaceRaised};
  border: 1px solid ${({ theme }) => theme.color.border};
  flex: none;

  img {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 6px;
  }
`;

const RemovePendingButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: ${({ theme }) => theme.color.textMuted};
  margin-left: auto;

  &:hover {
    background: ${({ theme }) => theme.color.border};
    color: ${({ theme }) => theme.color.text};
  }
`;

// The real-time chat surface — bubble history, image attach + send, all
// wired to useChatThread. Used both inline (BookingDetail's compact
// "Messages" card) and full-page (the dedicated /chat/:threadId view), via
// $flexFill to switch between a fixed-height scroll box and one that fills
// its flex parent.
export const ChatPanel = ({ bookingId, threadId, flexFill = false, emptyHint = "Chat isn't available for this booking." }) => {
  const { thread, messages, loading, sending, otherReadAt, send, messagesEndRef, user } = useChatThread({
    bookingId,
    threadId,
  });
  const [messageText, setMessageText] = useState("");
  const [pendingImage, setPendingImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const removePendingImage = () => {
    if (pendingImage?.previewUrl) URL.revokeObjectURL(pendingImage.previewUrl);
    setPendingImage(null);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setUploadingImage(true);
    try {
      // isPublic: true — the recipient (not the owner, not an admin) needs
      // to be able to view it, same reasoning as truck photos.
      const { file: uploaded } = await uploadFile(file, { isPublic: true });
      setPendingImage({ url: uploaded.url, previewUrl: URL.createObjectURL(file) });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = messageText.trim();
    if (!text && !pendingImage) return;
    try {
      await send({ text, imageUrl: pendingImage?.url });
      setMessageText("");
      removePendingImage();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <CenteredSpinner />;
  if (!thread) return <Muted>{emptyHint}</Muted>;

  return (
    <Panel $flexFill={flexFill}>
      <ChatScroll $flexFill={flexFill}>
        {messages.length === 0 && <Muted>No messages yet — say hello.</Muted>}
        {messages.map((m) => {
          const mine = String(m.sender) === String(user?.id);
          const read = mine && otherReadAt && new Date(m.createdAt) <= otherReadAt;
          return (
            <ChatBubble key={m._id} $mine={mine}>
              {m.image?.url && (
                <BubbleImage
                  src={`${BASE_URL}${m.image.url}`}
                  alt=""
                  onClick={() => window.open(`${BASE_URL}${m.image.url}`, "_blank", "noopener,noreferrer")}
                />
              )}
              {m.text && <span>{m.text}</span>}
              <BubbleFooter>
                <BubbleTime>
                  {new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </BubbleTime>
                {mine && (
                  <BubbleStatus $read={read} title={read ? "Read" : "Sent"}>
                    {read ? <CheckCheck size={13} strokeWidth={2.4} /> : <Check size={13} strokeWidth={2.4} />}
                  </BubbleStatus>
                )}
              </BubbleFooter>
            </ChatBubble>
          );
        })}
        <div ref={messagesEndRef} />
      </ChatScroll>

      {pendingImage && (
        <PendingImageRow>
          <img src={pendingImage.previewUrl} alt="Selected attachment" />
          <Muted>Image ready to send</Muted>
          <RemovePendingButton type="button" onClick={removePendingImage} aria-label="Remove image">
            <X size={14} strokeWidth={2.4} />
          </RemovePendingButton>
        </PendingImageRow>
      )}

      <ChatForm onSubmit={handleSubmit}>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
        <AttachButton
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage || sending}
          aria-label="Attach an image"
          title="Attach an image"
        >
          {uploadingImage ? <Spinner $size={16} /> : <ImagePlus size={18} strokeWidth={2.2} />}
        </AttachButton>
        <Input
          placeholder="Type a message…"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          disabled={sending}
        />
        <Button type="submit" disabled={sending || uploadingImage || (!messageText.trim() && !pendingImage)}>
          Send
        </Button>
      </ChatForm>
    </Panel>
  );
};

export default ChatPanel;
