type PlayButtonProps = {
  onPlay: () => void;
  title?: string;
};

export function PlayButton({ onPlay, title = 'Preview sound' }: PlayButtonProps) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="play-btn"
      title={title}
      aria-label={title}
    >
      ▶
    </button>
  );
}
