import { useState } from "react";
import { PeoplePanel } from "./PeoplePanel";
import { ChatPanel } from "./ChatPanel";
import { QueuePanel } from "./QueuePanel";
import { RequestsPanel } from "./RequestsPanel";

interface RoomPanelProps {
    participantsProps: any;
    chatProps: any;
    requestsProps: any;
    queueProps: any;
    canControl: boolean;
    pendingRequestsCount: number;
}

export function RoomPanel({
    participantsProps,
    chatProps,
    requestsProps,
    queueProps,
    canControl,
    pendingRequestsCount
}: RoomPanelProps) {
    const [activeTab, setActiveTab] = useState<"people" | "chat" | "queue" | "requests">("chat");

    const tabs = [
        { id: "people" as const, label: "People" },
        { id: "chat" as const, label: "Chat" },
        { id: "queue" as const, label: "Queue" },
        ...(canControl ? [{ id: "requests" as const, label: "Requests" }] : []),
    ];

    return (
        <aside className="room-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Tabs */}
            <div className="panel-tabs" style={{ display: 'flex' }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={activeTab === tab.id ? "active-tab" : ""}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            position: 'relative',
                            flex: 1,
                            padding: '14px 8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            letterSpacing: '0.2px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {tab.label}
                        {tab.id === "requests" && pendingRequestsCount > 0 && (
                            <span style={{
                                position: 'absolute', top: '8px', right: '8px',
                                background: '#ef4444', color: 'white',
                                fontSize: '10px', fontWeight: '700',
                                padding: '1px 5px', borderRadius: '10px',
                                lineHeight: '16px'
                            }}>
                                {pendingRequestsCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="panel-content" style={{ padding: '16px', flex: 1 }}>
                {activeTab === "people" && <PeoplePanel {...participantsProps} />}
                {activeTab === "chat" && <ChatPanel {...chatProps} />}
                {activeTab === "queue" && <QueuePanel {...queueProps} />}
                {activeTab === "requests" && canControl && <RequestsPanel {...requestsProps} />}
            </div>
        </aside>
    );
}
