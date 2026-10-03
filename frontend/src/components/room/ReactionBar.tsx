interface ReactionBarProps {
    onReact?: (emoji: string) => void;
}

export function ReactionBar({ onReact }: ReactionBarProps) {
    const reactions = ["😂", "❤️", "🔥", "😲", "👏", "👎"];

    return (
        <div className="reaction-bar" style={{ display: 'flex', gap: '8px', padding: '12px 0' }}>
            {reactions.map((emoji) => (
                <button
                    key={emoji}
                    onClick={() => {
                        if (onReact) onReact(emoji);
                    }}
                    style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '24px',
                        padding: '8px 16px',
                        fontSize: '20px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, background 0.2s',
                    }}
                    title={`React with ${emoji}`}
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
}
