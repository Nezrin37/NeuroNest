import React, { useState } from 'react';
import { Search } from 'lucide-react';
import Avatar from '../shared/Avatar';
import { formatTimeIST, parseServerDate } from '../../utils/time';

const ConversationList = ({ conversations, selectedId, onSelect, currentUserId }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filtered = conversations.filter(c => 
        c.other_user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Grouping Logic
    const recentConvs = [];
    const earlierConvs = [];
    const now = new Date();

    filtered.forEach(conv => {
        const lastMsgDate = conv.last_message ? parseServerDate(conv.last_message.created_at) : new Date(0);
        const diffHours = (now - lastMsgDate) / (1000 * 60 * 60);
        // Recent if unread or within 24 hours
        if (conv.unread_count > 0 || diffHours < 24) {
            recentConvs.push(conv);
        } else {
            earlierConvs.push(conv);
        }
    });

    const renderConversation = (conv) => {
        const isActive = selectedId === conv.id;
        const otherUser = conv.other_user;
        const lastMessage = conv.last_message;
        const isUnread = conv.unread_count > 0;
        
        return (
            <div 
                key={conv.id} 
                className={`conv-item p-3 mb-2 position-relative d-flex align-items-center gap-3 ${isActive ? 'active' : ''}`}
                onClick={() => onSelect(conv)}
            >
                {isActive && (
                    <div className="position-absolute start-0 top-50 translate-middle-y rounded-end" style={{ width: '4px', height: '24px', backgroundColor: '#3b82f6' }}></div>
                )}
                
                <div className="position-relative flex-shrink-0">
                    <Avatar 
                        src={otherUser?.profile_image} 
                        alt={otherUser?.name} 
                        style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                    />
                    {otherUser?.is_online && (
                        <div className="position-absolute border border-white border-2 rounded-circle" style={{ width: '14px', height: '14px', backgroundColor: '#22c55e', bottom: '0px', right: '0px' }}></div>
                    )}
                </div>
                
                <div className="flex-grow-1 min-w-0">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                        <h3 className="mb-0 text-truncate" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', maxWidth: '140px' }}>
                            {otherUser?.name}
                        </h3>
                        <span className="text-nowrap" style={{ fontSize: '0.7rem', fontWeight: 600, color: isActive ? '#3b82f6' : '#94a3b8' }}>
                            {lastMessage ? formatTimeIST(lastMessage.created_at) : ''}
                        </span>
                    </div>
                    
                    <div className="d-flex justify-content-between align-items-center gap-2">
                        <p className="mb-0 text-truncate" style={{ fontSize: '0.85rem', fontWeight: isUnread ? 600 : 400, color: isUnread ? '#0f172a' : '#64748b' }}>
                            {lastMessage ? (
                                <span>
                                    {String(lastMessage.sender_id) === String(currentUserId) ? 'You: ' : ''}{lastMessage.content}
                                </span>
                            ) : (
                                <span className="fst-italic opacity-75">Start a conversation</span>
                            )}
                        </p>
                        
                        {isUnread && (
                            <div className="badge bg-primary rounded-circle d-flex align-items-center justify-content-center p-0 shadow-sm" style={{ width: '20px', height: '20px', fontSize: '0.65rem', flexShrink: 0 }}>
                                {conv.unread_count}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="d-flex flex-column border-end h-100" style={{ width: '340px', flexShrink: 0, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
            {/* Header */}
            <div className="p-4 pb-3">
                <div className="position-relative">
                    <Search size={18} className="position-absolute" style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        className="form-control border-0 rounded-pill shadow-sm text-dark search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-grow-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
                {filtered.length === 0 ? (
                    <div className="text-center py-5">
                        <p className="small fw-medium" style={{ color: '#94a3b8' }}>No conversations found.</p>
                    </div>
                ) : (
                    <>
                        {recentConvs.length > 0 && (
                            <div className="mb-4">
                                <div className="text-uppercase fw-bold mb-3 ms-2" style={{ fontSize: '0.75rem', letterSpacing: '0.08em', color: '#64748b' }}>Recent</div>
                                {recentConvs.map(renderConversation)}
                            </div>
                        )}
                        
                        {earlierConvs.length > 0 && (
                            <div>
                                <div className="text-uppercase fw-bold mb-3 ms-2" style={{ fontSize: '0.75rem', letterSpacing: '0.08em', color: '#64748b' }}>Earlier</div>
                                {earlierConvs.map(renderConversation)}
                            </div>
                        )}
                    </>
                )}
            </div>

            <style>{`
                .conv-item { 
                    transition: all 0.2s ease; 
                    border: 1px solid transparent; 
                    border-radius: 16px; 
                    background-color: transparent; 
                    cursor: pointer;
                }
                .conv-item:hover { 
                    background-color: #ffffff; 
                    border-color: #e2e8f0; 
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); 
                }
                .conv-item.active { 
                    background-color: #ffffff; 
                    border-color: #e2e8f0; 
                    box-shadow: 0 4px 12px -2px rgba(0,0,0,0.05); 
                }
                .search-input {
                    padding: 12px 16px 12px 44px !important;
                    font-size: 0.9rem;
                    background-color: #ffffff;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                .search-input:focus {
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
                }
                .min-w-0 { min-width: 0; }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default ConversationList;
