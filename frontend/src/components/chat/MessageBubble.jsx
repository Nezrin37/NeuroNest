import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CheckCheck, Download, Paperclip, Video, PhoneOff } from 'lucide-react';
import { resolveApiUrl } from '../../config/env';
import { formatTimeIST } from '../../utils/time';

const URL_PATTERN = /(https?:\/\/[^\s]+|\/api\/chat\/uploads\/[^\s]+|\/uploads\/[^\s]+)/i;

const extractFileName = (value = '') => {
    const trimmed = value.split('?')[0];
    const pieces = trimmed.split('/');
    return pieces[pieces.length - 1] || 'file';
};

const truncateMiddle = (value = '', max = 46) => {
    if (value.length <= max) return value;
    const head = value.slice(0, 24);
    const tail = value.slice(-14);
    return `${head}...${tail}`;
};

const getMessageFileUrl = (content = '') => {
    if (!URL_PATTERN.test(content)) return null;
    return resolveApiUrl(content.trim());
};

const MessageBubble = ({ message, isMe, otherUserAvatar, isActiveCallRequest = false }) => {
    const navigate = useNavigate();
    const content = message?.content || '';
    const isFileMessage = message?.type === 'file' || content.includes('/uploads/');
    const fileUrl = getMessageFileUrl(content);
    const fileName = fileUrl ? extractFileName(fileUrl) : null;

    return (
        <div className={`d-flex mb-3 ${isMe ? 'justify-content-end' : 'justify-content-start'}`} style={{ gap: '12px' }}>
            {!isMe && (
                <div className="flex-shrink-0 mt-auto mb-1">
                    <img src={otherUserAvatar || '/default-avatar.png'} alt="user" className="rounded-circle object-fit-cover shadow-sm bg-light" style={{ width: '36px', height: '36px', border: '2px solid white' }} />
                </div>
            )}
            <div className={`d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'}`} style={{ maxWidth: '75%' }}>
                <div 
                    className={`p-3 px-4 mb-1 position-relative ${isMe ? 'text-white' : 'border-0'}`}
                    style={{ 
                        background: isMe ? 'var(--nn-chat-doctor-bg)' : 'var(--nn-chat-patient-bg)',
                        color: isMe ? 'var(--nn-chat-doctor-text)' : 'var(--nn-chat-patient-text)',
                        borderBottomRightRadius: isMe ? '4px' : '20px',
                        borderBottomLeftRadius: !isMe ? '4px' : '20px',
                        borderTopLeftRadius: '20px',
                        borderTopRightRadius: '20px',
                        boxShadow: isMe ? 'var(--nn-shadow-sm)' : 'none'
                    }}
                >
                {message?.type === 'call_request' ? (
                    <div className={`rounded-3 p-3 ${isMe ? 'bg-white bg-opacity-25' : 'bg-white border'}`}>
                        <div className="d-flex align-items-center gap-2 mb-2 fw-bold text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                            <Video size={16} />
                            <span>Video Consultation</span>
                        </div>
                        <p className={`mb-3 small fw-medium ${isMe ? 'text-white text-opacity-75' : 'text-secondary'}`}>{content}</p>
                        {isActiveCallRequest ? (
                            <button 
                                className={`btn btn-sm fw-bold w-100 rounded-pill shadow-sm transition-all hover-scale ${isMe ? 'btn-light text-primary' : 'btn-primary text-white'}`}
                                onClick={() => navigate(`/consultation/${message.conversation_id}`)}
                            >
                                Join Consult
                            </button>
                        ) : (
                            <div
                                className={`btn btn-sm fw-bold w-100 rounded-pill ${isMe ? 'btn-light text-secondary' : 'btn-secondary text-white'} disabled`}
                                style={{ opacity: 0.75, cursor: 'not-allowed' }}
                            >
                                Consultation Ended
                            </div>
                        )}
                    </div>
                ) : message?.type === 'call_ended' ? (
                    <div className={`rounded-3 p-3 ${isMe ? 'bg-white bg-opacity-25' : 'bg-white border'}`}>
                        <div className="d-flex align-items-center gap-2 mb-1 fw-bold text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                            <PhoneOff size={16} />
                            <span>Consultation Ended</span>
                        </div>
                        <p className={`mb-0 small fw-medium ${isMe ? 'text-white text-opacity-75' : 'text-secondary'}`}>{content}</p>
                    </div>
                ) : isFileMessage && fileUrl ? (
                    <div className={`rounded-3 p-3 text-start ${isMe ? 'bg-white bg-opacity-25' : 'bg-white border'}`}>
                        <div className="d-flex align-items-center gap-2 mb-1 fw-bold text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.05em', opacity: isMe ? 0.8 : 0.6 }}>
                            <Paperclip size={14} />
                            <span>Uploaded File</span>
                        </div>
                        <div className={`fw-bold text-truncate mb-2 ${isMe ? 'text-white' : 'text-dark'}`} style={{ fontSize: '0.85rem' }} title={fileName}>
                            {truncateMiddle(fileName)}
                        </div>
                        <a
                            className={`btn btn-sm d-inline-flex align-items-center gap-2 rounded-pill fw-bold text-decoration-none shadow-sm transition-all hover-scale ${isMe ? 'bg-white text-primary hover-bg-light' : 'bg-primary text-white hover-bg-primary-dark'}`}
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={fileUrl}
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                        >
                            <Download size={14} />
                            <span>Download</span>
                        </a>
                    </div>
                ) : (
                    <div className="text-break lh-sm fw-medium" style={{ fontSize: '0.9rem' }}>{content}</div>
                )}
                </div>
                
                <div className={`d-flex align-items-center gap-1 ${isMe ? 'justify-content-end' : 'justify-content-start'} w-100 px-1`}>
                    <span className="small text-secondary fw-semibold" style={{ fontSize: '0.65rem' }}>
                        {formatTimeIST(message.created_at)}
                    </span>
                    {isMe && (
                        <span className={message.is_read ? 'text-info' : 'text-secondary opacity-50'}>
                            {message.is_read ? <CheckCheck size={14} /> : <Check size={14} />}
                        </span>
                    )}
                </div>
            </div>

            <style>{`
                .hover-scale:hover { transform: scale(1.02); }
                .hover-bg-light:hover { background-color: #f8f9fa !important; }
                .hover-bg-primary-dark:hover { background-color: #0b5ed7 !important; color: white !important; }
            `}</style>
        </div>
    );
};

export default MessageBubble;
