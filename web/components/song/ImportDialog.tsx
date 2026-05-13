'use client';

import { useEffect, useRef, useState } from 'react';
import { newSong, parseChordPro } from '@/lib/songs';
import { songsRepo } from '@/lib/storage';

type Props = {
  onClose: () => void;
  onCreated: (id: string) => void;
};

export function ImportDialog({ onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const preview = parseChordPro(body);
  const lyricLines = preview.sections.reduce((n, s) => n + s.lines.filter(l => l.kind === 'lyric').length, 0);
  const chordCount = preview.sections.reduce(
    (n, s) => n + s.lines.reduce((m, l) => m + l.tokens.filter(t => t.kind === 'chord').length, 0),
    0,
  );

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const text = await file.text();
    setBody(text);
    if (!title && file.name) setTitle(file.name.replace(/\.[^.]+$/, ''));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onFiles(e.dataTransfer.files);
  };

  const onSave = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const song = newSong({ title: title.trim() || undefined, body: trimmed });
    songsRepo.save(song);
    onCreated(song.id);
  };

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className={`dialog ${dragging ? 'is-dragging' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <header className="dialog-head">
          <h2>Import song</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="dialog-body">
          <label className="field">
            <span className="field-label">Title <span className="field-hint">(optional — pulled from {'{title:}'} if blank)</span></span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fast Car"
            />
          </label>

          <label className="field">
            <span className="field-label">
              <span className="field-label-row">
                <span>Lyrics & chords</span>
                <button
                  type="button"
                  className="field-action"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon /> Upload file
                </button>
              </span>
              <span className="field-hint">paste, drag a file in, or tap upload</span>
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.chordpro,.crd,.cho,.pro,.tab,text/plain"
              className="visually-hidden"
              onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }}
            />
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              placeholder={`{title: Wonderwall}\n{key: Em7}\n\n{soc}\nAnd all the [G]roads we have to [D]walk are [Am]winding\n{eoc}`}
            />
          </label>

          {body.trim() && (
            <div className="import-summary">
              <span><strong>{lyricLines}</strong> lyric lines</span>
              <span><strong>{chordCount}</strong> chord{chordCount === 1 ? '' : 's'}</span>
              {preview.meta.title && <span>Title: <em>{preview.meta.title}</em></span>}
              {preview.meta.key && <span>Key: <em>{preview.meta.key}</em></span>}
            </div>
          )}

          {dragging && <div className="drop-overlay">Drop file to import</div>}
        </div>

        <footer className="dialog-foot">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={onSave} disabled={!body.trim()}>Save song</button>
        </footer>
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}
