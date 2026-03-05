import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { initSocket, getSocket, disconnectSocket } from '../../services/socket';
import chatAPI from '../../services/chatAPI';
import ConversationList from '../../components/chat/ConversationList';
import ChatWindow from '../../components/chat/ChatWindow';
import ChatHeader from '../../components/chat/ChatHeader';
import { getUser } from '../../utils/auth';
import { formatDateTimeIST, toEpochMs } from '../../utils/time';

const Chat = () => {
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [selectedConv, setSelectedConv] = useState(null);
    const [messages, setMessages] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [messagesLoadError, setMessagesLoadError] = useState('');
    const [showInfoPanel, setShowInfoPanel] = useState(false);

    const fetchConversations = useCallback(async () => {
        try {
            const data = await chatAPI.getConversations();
            setConversations(data);
        } catch (err) {
            console.error("Failed to load conversations", err);
        }
    }, []);

    const handleSelectConversation = async (conv) => {
        if (selectedConv?.id === conv.id) return;
        
        setSelectedConv(conv);
        setShowInfoPanel(false);
        setMessages([]);
        setLoadingMessages(true);
        setMessagesLoadError('');

        // Mark as read immediately if unread
        if (conv.unread_count > 0) {
            try {
                await chatAPI.markAsRead(conv.id);
                setConversations(prev => prev.map(c => 
                    c.id === conv.id ? { ...c, unread_count: 0 } : c
                ));
            } catch (err) {
                console.error("Failed to mark as read", err);
            }
        }

        // Fetch Messages
        try {
            const data = await chatAPI.getMessages(conv.id);
            const normalized = Array.isArray(data) ? data : [];

            if (normalized.length === 0 && conv.last_message?.content) {
                setMessages([{
                    id: `fallback-${conv.id}`,
                    conversation_id: conv.id,
                    sender_id: conv.last_message.sender_id,
                    content: conv.last_message.content,
                    type: conv.last_message.type || 'text',
                    is_read: conv.last_message.is_read ?? true,
                    created_at: conv.last_message.created_at || new Date().toISOString(),
                }]);
            } else {
                setMessages(normalized);
            }
            
            // Join Room
            const socket = getSocket();
            if (socket) {
                socket.emit('join_conversation', { conversation_id: conv.id });
            }
        } catch (err) {
            console.error("Failed to load messages", err);
            setMessagesLoadError('Unable to load full message history right now.');
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleNewMessage = useCallback((msg) => {
        setSelectedConv((current) => {
            if (current?.id === msg.conversation_id) {
                setMessages((prev) => {
                    if (prev.find(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
            }
            return current;
        });

        setConversations(prev => (
            prev
                .map(c => {
                    if (c.id === msg.conversation_id) {
                        return {
                            ...c,
                            last_message: {
                                content: msg.content,
                                created_at: msg.created_at,
                                is_read: false,
                                sender_id: msg.sender_id
                            },
                            unread_count:
                                String(msg.sender_id) !== String(currentUser?.id) && selectedConv?.id !== msg.conversation_id
                                    ? c.unread_count + 1
                                    : c.unread_count
                        };
                    }
                    return c;
                })
                .sort((a, b) => toEpochMs(b.last_message?.created_at) - toEpochMs(a.last_message?.created_at))
        ));
    }, [currentUser?.id, selectedConv?.id]);

    useEffect(() => {
        const user = getUser();
        if (user) setCurrentUser(user);

        const socket = initSocket();
        fetchConversations();

        if (socket) {
            socket.on("new_message", (msg) => {
                handleNewMessage(msg);
            });
        }

        return () => {
            disconnectSocket();
        };
    }, [fetchConversations, handleNewMessage]);

    const handleSendMessage = async (content, type = 'text') => {
        if (!selectedConv || !currentUser) return;
        
        try {
            const socket = getSocket();
            if (socket && socket.connected) {
                socket.emit('send_message', {
                    conversation_id: selectedConv.id,
                    content: content,
                    type: type
                });
            } else {
                const savedMsg = await chatAPI.sendMessage(selectedConv.id, content, type);
                handleNewMessage(savedMsg);
            }
        } catch (err) {
            console.error("Failed to send message", err);
        }
    };

    const handleVideoCall = async () => {
        if (!selectedConv) return;
        await handleSendMessage(`${currentUser?.full_name || 'Patient'} is requesting a secure video consultation.`, 'call_request');
        navigate(`/consultation/${selectedConv.id}`);
    };

    return (
        <div className="d-flex bg-white h-100 overflow-hidden rounded-4 shadow-sm">
            {/* Sidebar */}
            <ConversationList 
                conversations={conversations}
                selectedId={selectedConv?.id}
                onSelect={handleSelectConversation}
                currentUserId={currentUser?.id}
            />

            {/* Chat Area */}
            {selectedConv ? (
                <div className="d-flex flex-column flex-grow-1 min-w-0 bg-transparent position-relative" style={{ minHeight: 0, overflow: 'hidden' }}>
                    <ChatHeader 
                        otherUser={selectedConv.other_user}
                        isDoctor={false}
                        showSidebar={showInfoPanel}
                        onToggleSidebar={() => setShowInfoPanel((prev) => !prev)}
                        onVideoCall={handleVideoCall}
                    />
                    <div className="d-flex flex-grow-1 overflow-hidden">
                        <ChatWindow 
                            messages={messages}
                            currentUserId={currentUser?.id}
                            onSendMessage={handleSendMessage}
                            loadingMessages={loadingMessages}
                            messagesLoadError={messagesLoadError}
                            isDoctor={false}
                            otherUser={selectedConv.other_user}
                        />
                        
                        {showInfoPanel && (
                            <aside className="border-start bg-light overflow-y-auto custom-scrollbar" style={{ width: '320px', flexShrink: 0 }}>
                                <div className="p-4 border-bottom bg-white sticky-top">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <h4 className="fw-bolder text-dark mb-0" style={{ fontSize: '1.1rem' }}>Doctor Details</h4>
                                        <button className="btn-close shadow-none d-lg-none" onClick={() => setShowInfoPanel(false)}></button>
                                    </div>
                                    <p className="text-secondary small fw-medium mb-0">Care provider profile</p>
                                </div>
                                <div className="p-4 d-flex flex-column gap-3">
                                    {[
                                        { label: 'Doctor Name', value: selectedConv.other_user?.name || 'Unknown' },
                                        { label: 'Email', value: selectedConv.other_user?.email || 'N/A' },
                                        { label: 'Role', value: selectedConv.other_user?.role || 'doctor' },
                                        { label: 'Status', value: selectedConv.other_user?.is_online ? 'Online' : 'Last seen recently' },
                                        { label: 'Last Interaction', value: selectedConv.last_message?.created_at ? formatDateTimeIST(selectedConv.last_message.created_at) : 'N/A' }
                                    ].map((info, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-4 border shadow-sm">
                                            <span className="d-block text-secondary text-uppercase fw-bold mb-1" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>{info.label}</span>
                                            <div className="fw-bolder text-dark" style={{ fontSize: '0.85rem', wordBreak: 'break-word' }}>{info.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </aside>
                        )}
                    </div>
                </div>
            ) : (
                <div className="d-flex flex-grow-1 align-items-center justify-content-center bg-light bg-opacity-50">
                    <div className="text-center p-5">
                        <div className="display-1 mb-4 opacity-25">💬</div>
                        <h2 className="fw-bolder text-dark mb-2">Clinical Support Portal</h2>
                        <p className="text-secondary mb-4 mx-auto" style={{ maxWidth: '300px' }}>Connecting you with your care team in a secure, encrypted environment.</p>
                        <div className="d-flex flex-wrap justify-content-center gap-2">
                            {['Secure Messaging', 'File Sharing', 'Care Coordination'].map((hint, i) => (
                                <span key={i} className="badge bg-white text-secondary border rounded-pill px-3 py-2 fw-bold shadow-sm">
                                    {hint}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default Chat;
