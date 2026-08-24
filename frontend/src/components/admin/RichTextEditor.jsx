import { useEffect } from "react";
import styled from "styled-components";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  ImagePlus,
  Undo2,
  Redo2,
} from "lucide-react";
import { uploadFile } from "../../api/files";
import { brandingAssetUrl } from "../../context/BrandingContext";

// The admin-only rich text editor behind PostEditor.jsx — TipTap, not a
// Markdown textarea: the author is a non-technical admin, not someone who
// should need to remember Markdown syntax to write a blog post. Headless
// (no bundled CSS of its own, unlike Quill/CKEditor), so it's themed here
// with this app's own admin color tokens instead of fighting an imported
// stylesheet. Lands only in this lazy-loaded admin editor chunk — never in
// the public bundle (see routing/Routing.jsx's lazy() for PostEditor).
const Wrap = styled.div`
  border: 1px solid ${({ theme }) => theme.admin.color.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.admin.color.surface};
  overflow: hidden;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.admin.color.border};
  background: ${({ theme }) => theme.admin.color.bg};
`;

const ToolbarDivider = styled.span`
  width: 1px;
  align-self: stretch;
  margin: 2px 4px;
  background: ${({ theme }) => theme.admin.color.border};
`;

const ToolButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme, $active }) => ($active ? theme.admin.color.primary : theme.admin.color.textSecondary)};
  background: ${({ theme, $active }) => ($active ? theme.admin.color.primarySoft : "transparent")};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.admin.color.primarySoft};
    color: ${({ theme }) => theme.admin.color.primary};
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const EditorArea = styled.div`
  padding: 16px 18px;
  min-height: 320px;
  max-height: 640px;
  overflow-y: auto;
  color: ${({ theme }) => theme.admin.color.text};
  font-size: 15px;
  line-height: 1.7;

  .ProseMirror {
    outline: none;
  }
  .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
    color: ${({ theme }) => theme.admin.color.textSecondary};
  }
  .ProseMirror h2 {
    font-size: 1.4em;
    font-weight: 700;
    margin: 1em 0 0.4em;
  }
  .ProseMirror h3 {
    font-size: 1.2em;
    font-weight: 700;
    margin: 1em 0 0.4em;
  }
  .ProseMirror p {
    margin: 0 0 0.9em;
  }
  .ProseMirror ul,
  .ProseMirror ol {
    padding-left: 1.4em;
    margin: 0 0 0.9em;
  }
  .ProseMirror blockquote {
    margin: 0 0 0.9em;
    padding-left: 1em;
    border-left: 3px solid ${({ theme }) => theme.admin.color.border};
    color: ${({ theme }) => theme.admin.color.textSecondary};
  }
  .ProseMirror img {
    max-width: 100%;
    border-radius: ${({ theme }) => theme.radius.sm};
  }
  .ProseMirror a {
    color: ${({ theme }) => theme.admin.color.primary};
  }
`;

const VALID_LINK_SCHEMES = /^(https?:|mailto:)/i;

export const RichTextEditor = ({ value, onChange, placeholder = "Start writing…" }) => {
  const editor = useEditor({
    extensions: [
      // The page's own <h1> is the post title — an author-inserted h1 (or
      // h5/h6, which nothing in this app's typographic scale uses) inside
      // the body is a real, common SEO regression, not just a style
      // mismatch, so those levels are disabled at the editor level rather
      // than relying on the sanitizer to quietly unwrap them later.
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  // Keeps the editor in sync when `value` changes from OUTSIDE typing (e.g.
  // PostEditor.jsx finishing an async load of an existing post) — without
  // this, the editor would stay empty since TipTap only owns its content
  // after the initial `content` option.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    try {
      const { file: uploaded } = await uploadFile(file, { isPublic: true });
      const alt = window.prompt("Describe this image (alt text)") || "";
      editor.chain().focus().setImage({ src: brandingAssetUrl(uploaded.url), alt }).run();
    } catch {
      // uploadFile's own ApiError already carries a real message — the
      // editor itself has nowhere to render a toast from here without
      // pulling in react-toastify just for this one path, so this is a
      // silent no-op failure the admin can just retry.
    }
  };

  const handleSetLink = () => {
    const previousUrl = editor.getAttributes("link").href || "";
    const url = window.prompt("Link URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!VALID_LINK_SCHEMES.test(url)) {
      window.alert("Links must start with http://, https://, or mailto:");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <Wrap>
      <Toolbar>
        <ToolButton
          type="button"
          $active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <Bold size={16} />
        </ToolButton>
        <ToolButton
          type="button"
          $active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <Italic size={16} />
        </ToolButton>
        <ToolbarDivider />
        <ToolButton
          type="button"
          $active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="Heading 2"
        >
          <Heading2 size={16} />
        </ToolButton>
        <ToolButton
          type="button"
          $active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-label="Heading 3"
        >
          <Heading3 size={16} />
        </ToolButton>
        <ToolbarDivider />
        <ToolButton
          type="button"
          $active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet list"
        >
          <List size={16} />
        </ToolButton>
        <ToolButton
          type="button"
          $active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Numbered list"
        >
          <ListOrdered size={16} />
        </ToolButton>
        <ToolButton
          type="button"
          $active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          aria-label="Quote"
        >
          <Quote size={16} />
        </ToolButton>
        <ToolbarDivider />
        <ToolButton type="button" $active={editor.isActive("link")} onClick={handleSetLink} aria-label="Link">
          <Link2 size={16} />
        </ToolButton>
        <ToolButton type="button" as="label" aria-label="Insert image">
          <ImagePlus size={16} />
          <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
        </ToolButton>
        <ToolbarDivider />
        <ToolButton
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          aria-label="Undo"
        >
          <Undo2 size={16} />
        </ToolButton>
        <ToolButton
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          aria-label="Redo"
        >
          <Redo2 size={16} />
        </ToolButton>
      </Toolbar>
      <EditorArea>
        <EditorContent editor={editor} />
      </EditorArea>
    </Wrap>
  );
};

export default RichTextEditor;
