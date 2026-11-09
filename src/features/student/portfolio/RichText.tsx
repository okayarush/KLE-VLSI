import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Code, Italic, List, ListOrdered, Subscript as SubIcon, Superscript as SupIcon } from 'lucide-react'
import { useStore } from '../../../state/store'

/** Plain text of the document with paragraph breaks kept as newlines (progress, readiness and AI all read plain text). */
const plainOf = (ed: { getText: (o?: { blockSeparator?: string }) => string }) => ed.getText({ blockSeparator: '\n' })

/** Existing plain text (e.g. demo seed) becomes paragraphs; saved Tiptap JSON is used as-is. */
function initial(doc: unknown, text: string) {
  if (doc) return doc as object
  return { type: 'doc', content: (text || '').split('\n').map((line) => (line ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' })) }
}

export default function RichText({ docKey, title, placeholder, onChange }: { docKey: string; title: string; placeholder: string; onChange: (plain: string, doc: unknown) => void }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: false, blockquote: false, horizontalRule: false }), Subscript, Superscript, Placeholder.configure({ placeholder })],
    content: initial(useStore.getState().proseDoc[docKey], useStore.getState().prose[docKey] ?? ''),
    editorProps: { attributes: { class: 'textarea notebook rt', 'aria-label': title, role: 'textbox', 'aria-multiline': 'true' } },
    onUpdate: ({ editor: ed }) => onChange(plainOf(ed), ed.getJSON()),
  })
  // Reset-demo etc. replaces the text from outside the editor
  const external = useStore((s) => s.prose[docKey] ?? '')
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (external !== plainOf(editor)) editor.commands.setContent(initial(useStore.getState().proseDoc[docKey], external), { emitUpdate: false })
  }, [external, editor, docKey])
  if (!editor || editor.isDestroyed) return null
  const B = ({ on, run, label, children }: { on: boolean; run: () => void; label: string; children: React.ReactNode }) =>
    <button type="button" className={`rt-btn ${on ? 'on' : ''}`} aria-label={label} aria-pressed={on} title={label} onMouseDown={(e) => e.preventDefault()} onClick={run}>{children}</button>
  return (
    <div className="rt-wrap">
      <div className="rt-bar" role="toolbar" aria-label="Formatting">
        <B on={editor.isActive('bold')} run={() => editor.chain().focus().toggleBold().run()} label="Bold"><Bold size={15} /></B>
        <B on={editor.isActive('italic')} run={() => editor.chain().focus().toggleItalic().run()} label="Italic"><Italic size={15} /></B>
        <B on={editor.isActive('subscript')} run={() => editor.chain().focus().toggleSubscript().run()} label="Subscript"><SubIcon size={15} /></B>
        <B on={editor.isActive('superscript')} run={() => editor.chain().focus().toggleSuperscript().run()} label="Superscript"><SupIcon size={15} /></B>
        <B on={editor.isActive('code')} run={() => editor.chain().focus().toggleCode().run()} label="Inline code"><Code size={15} /></B>
        <B on={editor.isActive('bulletList')} run={() => editor.chain().focus().toggleBulletList().run()} label="Bullet list"><List size={15} /></B>
        <B on={editor.isActive('orderedList')} run={() => editor.chain().focus().toggleOrderedList().run()} label="Numbered list"><ListOrdered size={15} /></B>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
