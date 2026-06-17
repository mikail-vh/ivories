'use client';

/* Reusable voicing flipper: previous/next arrows with progress dots. Used by
 * both the song-page palette and the main /chords cheatsheet. */
export function VoicingFlipper({
  idx, total, onChange,
}: {
  idx: number;
  total: number;
  onChange: (next: number) => void;
}) {
  if (total <= 1) return null;
  return (
    <div className="voicing-flipper">
      <button
        type="button"
        aria-label="Previous voicing"
        disabled={idx === 0}
        onClick={() => onChange(Math.max(0, idx - 1))}
      >
        ‹
      </button>
      <span className="dots" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i === idx ? 'on' : ''} />
        ))}
      </span>
      <button
        type="button"
        aria-label="Next voicing"
        disabled={idx === total - 1}
        onClick={() => onChange(Math.min(total - 1, idx + 1))}
      >
        ›
      </button>
    </div>
  );
}
