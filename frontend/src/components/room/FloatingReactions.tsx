import "./FloatingReactions.css";

export interface FloatingReaction {
    id: string;
    emoji: string;
    left: number; // percentage 0-100
}

interface FloatingReactionsProps {
    reactions: FloatingReaction[];
    onComplete: (id: string) => void;
}

export function FloatingReactions({ reactions, onComplete }: FloatingReactionsProps) {
    return (
        <div className="floating-reactions-container" aria-hidden="true">
            {reactions.map((r) => (
                <div
                    key={r.id}
                    className="floating-reaction"
                    style={{ left: `${r.left}%` }}
                    onAnimationEnd={() => onComplete(r.id)}
                >
                    {r.emoji}
                </div>
            ))}
        </div>
    );
}
