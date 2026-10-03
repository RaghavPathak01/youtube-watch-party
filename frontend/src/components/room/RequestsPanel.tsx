interface RequestItem {
    requestId: string;
    userId: string;
    username: string;
    action: string;
    data?: any;
}

interface RequestsPanelProps {
    requests: RequestItem[];
    canControl: boolean;
    onApprove: (requestId: string) => void;
    onReject: (requestId: string) => void;
}

export function RequestsPanel({ requests, canControl, onApprove, onReject }: RequestsPanelProps) {
    if (!canControl) {
        return (
            <div className="requests-panel empty-state" style={{ padding: '20px', textAlign: 'center', color: '#a1a1aa' }}>
                <p>Only the Host and Moderators can manage requests.</p>
            </div>
        );
    }

    return (
        <div className="requests-panel">
            <div className="panel-heading">
                <div>
                    <span className="panel-label">MODERATION</span>
                    <h2>Action Requests</h2>
                </div>
                {requests.length > 0 && (
                    <span className="request-count">{requests.length} pending</span>
                )}
            </div>

            {requests.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px', textAlign: 'center', color: '#a1a1aa' }}>
                    <p>No pending requests.</p>
                </div>
            ) : (
                <div className="requests-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
                    {requests.map((request) => (
                        <div className="request-item" key={request.requestId} style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            <div style={{ marginBottom: '8px' }}>
                                <strong>{request.username}</strong>
                                <span style={{ color: '#a1a1aa' }}> requested to </span>
                                <strong style={{ color: '#a855f7' }}>{request.action.replace('_', ' ')}</strong>
                            </div>
                            <div className="request-actions" style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => onApprove(request.requestId)}
                                    style={{ flex: 1, padding: '8px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => onReject(request.requestId)}
                                    style={{ flex: 1, padding: '8px', background: 'transparent', color: '#f4f4f5', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
