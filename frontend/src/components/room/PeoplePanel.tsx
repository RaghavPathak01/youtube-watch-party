import type { Participant } from "../../types/room";

interface PeoplePanelProps {
    participants: Participant[];
    currentUser: Participant | null;
    isHost: boolean;
    onMakeModerator: (socketId: string) => void;
    onRemoveParticipant: (socketId: string) => void;
}

export function PeoplePanel({
    participants,
    currentUser,
    isHost,
    onMakeModerator,
    onRemoveParticipant
}: PeoplePanelProps) {
    return (
        <div className="participants-panel">
            <div className="panel-heading">
                <div>
                    <span className="panel-label">PARTY CREW</span>
                    <h2>Participants</h2>
                </div>
                <span className="online-count">
                    {participants.length} online
                </span>
            </div>

            <div className="participants-list">
                {participants.map((participant) => (
                    <div
                        className={`participant ${participant.role === "host" ? "host" : ""}`}
                        key={participant.socketId}
                    >
                        <div className="participant-avatar">
                            {participant.username.charAt(0).toUpperCase()}
                        </div>

                        <div className="participant-info">
                            <strong>
                                {participant.username}
                                {currentUser?.socketId === participant.socketId && (
                                    <span className="you-label"> You</span>
                                )}
                            </strong>

                            {participant.role === "host" && (
                                <span className="participant-role host">Host</span>
                            )}
                            {participant.role === "moderator" && (
                                <span className="participant-role moderator">Moderator</span>
                            )}
                        </div>

                        {isHost && currentUser?.socketId !== participant.socketId && (
                            <div className="participant-actions">
                                {participant.role === "participant" && (
                                    <button className="moderator-btn" onClick={() => onMakeModerator(participant.socketId)}>
                                        Make Moderator
                                    </button>
                                )}
                                <button className="remove" onClick={() => onRemoveParticipant(participant.socketId)}>
                                    Remove
                                </button>
                            </div>
                        )}

                        <div className="online-dot"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}
