import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Undo, Redo } from "lucide-react";

const MenuButton = ({ onClick, active, children, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded transition-colors ${active ? "bg-[#1B4D3E] text-[#FFFFF0]" : "text-[#1B4D3E]/60 hover:bg-[#1B4D3E]/10"}`}
  >
    {children}
  </button>
);

const RichTextEditor = ({ value, onChange, className = "" }) => {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div className={`border border-[#DACBA0]/50 rounded-md overflow-hidden ${className}`} data-testid="rich-text-editor">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#DACBA0]/30 bg-[#FFFFF0]">
        <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold className="w-4 h-4" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic className="w-4 h-4" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
          <UnderlineIcon className="w-4 h-4" />
        </MenuButton>
        <div className="w-px h-5 bg-[#DACBA0]/30 mx-1" />
        <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
          <List className="w-4 h-4" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List">
          <ListOrdered className="w-4 h-4" />
        </MenuButton>
        <div className="w-px h-5 bg-[#DACBA0]/30 mx-1" />
        <MenuButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo className="w-4 h-4" />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo className="w-4 h-4" />
        </MenuButton>
      </div>
      <EditorContent editor={editor} className="tiptap-editor" />
    </div>
  );
};

export default RichTextEditor;
