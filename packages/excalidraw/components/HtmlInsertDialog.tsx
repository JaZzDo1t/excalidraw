import React, { useEffect, useRef, useState } from "react";
import "./HtmlInsertDialog.scss";

interface HtmlInsertDialogProps {
  initialHtml?: string;
  isEditing?: boolean;
  onInsert: (html: string) => void;
  onClose: () => void;
}

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: system-ui, sans-serif; padding: 20px; background: #f5f5f7; }
  h1 { color: #1d1d1f; }
  button { padding: 10px 20px; background: #0071e3; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
  button:hover { background: #0077ed; }
</style>
</head>
<body>
  <h1>Hello from Excalidraw!</h1>
  <p>This is a live HTML page on your canvas.</p>
  <button onclick="this.textContent = 'Clicked ' + new Date().toLocaleTimeString()">
    Click me
  </button>
</body>
</html>`;

export const HtmlInsertDialog: React.FC<HtmlInsertDialogProps> = ({
  initialHtml,
  isEditing = false,
  onInsert,
  onClose,
}) => {
  const [html, setHtml] = useState(initialHtml ?? SAMPLE_HTML);
  const [previewHtml, setPreviewHtml] = useState(html);
  const debounceRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Debounce preview update
  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      setPreviewHtml(html);
    }, 300);
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [html]);

  const handleInsert = () => {
    if (html.trim().length === 0) {
      return;
    }
    onInsert(html);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleInsert();
    }
  };

  return (
    <div
      className="HtmlInsertDialog__backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="HtmlInsertDialog"
        onKeyDown={handleKeyDown}
      >
        <div className="HtmlInsertDialog__header">
          <h2>{isEditing ? "Edit HTML" : "Insert HTML"}</h2>
          <button
            type="button"
            className="HtmlInsertDialog__close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="HtmlInsertDialog__hint">
          Paste any HTML (including &lt;style&gt; and &lt;script&gt;). Press{" "}
          <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to {isEditing ? "save" : "insert"}.
        </div>

        <div className="HtmlInsertDialog__split">
          <div className="HtmlInsertDialog__editor">
            <div className="HtmlInsertDialog__label">HTML source</div>
            <textarea
              ref={textareaRef}
              spellCheck={false}
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="<!DOCTYPE html>..."
            />
          </div>
          <div className="HtmlInsertDialog__preview">
            <div className="HtmlInsertDialog__label">Live preview</div>
            <iframe
              title="HTML preview"
              srcDoc={previewHtml}
              sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        </div>

        <div className="HtmlInsertDialog__footer">
          <button
            type="button"
            className="HtmlInsertDialog__btn HtmlInsertDialog__btn--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="HtmlInsertDialog__btn HtmlInsertDialog__btn--primary"
            onClick={handleInsert}
            disabled={html.trim().length === 0}
          >
            {isEditing ? "Save" : "Insert"}
          </button>
        </div>
      </div>
    </div>
  );
};
