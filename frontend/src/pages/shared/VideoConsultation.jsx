import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, Mic, MicOff, VideoOff, PhoneOff } from 'lucide-react';
import { getUser } from '../../utils/auth';
import { io } from 'socket.io-client';
import { sendMessage } from '../../api/chat';

export default function VideoConsultation() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const user = getUser();
    
    const localVideo = useRef(null);
    const remoteVideo = useRef(null);
    const peerConnection = useRef(null);
    const socket = useRef(null);
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const iceCandidateQueue = useRef([]);
    const hasSentCallEndedRef = useRef(false);
    
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isRemoteConnected, setIsRemoteConnected] = useState(false);

    useEffect(() => {
        const room = `consult_${roomId}`;
        let isDisposed = false;

        const flushQueuedIceCandidates = async () => {
            if (!peerConnection.current) return;
            while (iceCandidateQueue.current.length > 0) {
                const candidate = iceCandidateQueue.current.shift();
                await peerConnection.current.addIceCandidate(candidate);
            }
        };

        const notifyCallEnded = async () => {
            if (hasSentCallEndedRef.current) return;
            const conversationId = Number(roomId);
            if (!Number.isInteger(conversationId)) return;
            hasSentCallEndedRef.current = true;
            const roleLabel = user?.role === 'doctor' ? 'Doctor' : 'Patient';
            try {
                await sendMessage(
                    conversationId,
                    `${roleLabel} ended the consultation.`,
                    'call_ended',
                );
            } catch (err) {
                console.error("Failed to send call_ended message:", err);
            }
        };

        const startCall = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                if (isDisposed) return;

                localStreamRef.current = stream;
                if (localVideo.current) {
                    localVideo.current.srcObject = stream;
                }

                peerConnection.current = new RTCPeerConnection({
                    iceServers: [
                        { urls: "stun:stun.l.google.com:19302" },
                        { urls: "stun:stun1.l.google.com:19302" },
                    ],
                });
                remoteStreamRef.current = new MediaStream();
                if (remoteVideo.current) {
                    remoteVideo.current.srcObject = remoteStreamRef.current;
                    remoteVideo.current.muted = false;
                    remoteVideo.current.volume = 1;
                }

                stream.getTracks().forEach((track) => {
                    peerConnection.current?.addTrack(track, stream);
                });

                peerConnection.current.ontrack = (event) => {
                    if (!remoteVideo.current) return;
                    // Safari/Brave mobile may deliver track events with empty event.streams.
                    // Build/maintain the remote MediaStream manually for maximum compatibility.
                    if (event.streams && event.streams[0]) {
                        remoteVideo.current.srcObject = event.streams[0];
                    } else if (remoteStreamRef.current && event.track) {
                        remoteStreamRef.current.addTrack(event.track);
                        remoteVideo.current.srcObject = remoteStreamRef.current;
                    }
                    remoteVideo.current
                        .play()
                        .catch((err) => console.warn("Remote autoplay blocked until user interaction:", err));
                    setIsRemoteConnected(true);
                };

                peerConnection.current.onconnectionstatechange = () => {
                    const state = peerConnection.current?.connectionState;
                    if (state === "disconnected" || state === "failed" || state === "closed") {
                        setIsRemoteConnected(false);
                    }
                };

                const token = localStorage.getItem("neuronest_token");
                const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
                socket.current = io(API_URL, {
                    transports: ['websocket', 'polling'],
                    query: { token },
                });

                peerConnection.current.onicecandidate = (event) => {
                    if (!event.candidate || !socket.current) return;
                    socket.current.emit("ice_candidate", {
                        room,
                        candidate: event.candidate,
                    });
                };

                socket.current.on("connect_error", (err) => {
                    console.error("Video socket connect_error:", err?.message || err);
                });

                socket.current.on("user_joined", async () => {
                    if (!peerConnection.current) return;
                    try {
                        const offer = await peerConnection.current.createOffer();
                        await peerConnection.current.setLocalDescription(offer);
                        socket.current.emit("webrtc_offer", { room, offer });
                    } catch (error) {
                        console.error("Error creating offer:", error);
                    }
                });

                socket.current.on("user_left", () => {
                    setIsRemoteConnected(false);
                    if (remoteVideo.current) {
                        remoteVideo.current.srcObject = null;
                    }
                    remoteStreamRef.current = new MediaStream();
                });

                socket.current.on("webrtc_offer", async (data) => {
                    if (!peerConnection.current) return;
                    try {
                        await peerConnection.current.setRemoteDescription(
                            new RTCSessionDescription(data.offer),
                        );
                        await flushQueuedIceCandidates();

                        const answer = await peerConnection.current.createAnswer();
                        await peerConnection.current.setLocalDescription(answer);
                        socket.current.emit("webrtc_answer", { room, answer });
                    } catch (error) {
                        console.error("Error handling offer:", error);
                    }
                });

                socket.current.on("webrtc_answer", async (data) => {
                    if (!peerConnection.current) return;
                    try {
                        await peerConnection.current.setRemoteDescription(
                            new RTCSessionDescription(data.answer),
                        );
                        await flushQueuedIceCandidates();
                    } catch (error) {
                        console.error("Error handling answer:", error);
                    }
                });

                socket.current.on("ice_candidate", async (data) => {
                    if (!peerConnection.current || !data?.candidate) return;
                    try {
                        const candidate = new RTCIceCandidate(data.candidate);
                        if (peerConnection.current.remoteDescription?.type) {
                            await peerConnection.current.addIceCandidate(candidate);
                        } else {
                            iceCandidateQueue.current.push(candidate);
                        }
                    } catch (error) {
                        console.error("Error adding ice candidate:", error);
                    }
                });

                socket.current.emit("join_video_room", { room });
            } catch (err) {
                console.error("Error accessing media devices.", err);
                alert("Could not access camera or microphone. Please check your permissions.");
            }
        };

        startCall();

        return () => {
            isDisposed = true;
            void notifyCallEnded();
            if (socket.current) {
                socket.current.emit("leave_video_room", { room });
                socket.current.disconnect();
                socket.current = null;
            }
            if (peerConnection.current) {
                peerConnection.current.close();
                peerConnection.current = null;
            }
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => track.stop());
                localStreamRef.current = null;
            }
            if (remoteVideo.current) {
                remoteVideo.current.srcObject = null;
            }
            remoteStreamRef.current = null;
            iceCandidateQueue.current = [];
        };
    }, [roomId]);

    const handleHangup = () => {
        navigate(-1);
    };

    const toggleAudio = () => {
        if (localVideo.current && localVideo.current.srcObject) {
            const audioTrack = localVideo.current.srcObject.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localVideo.current && localVideo.current.srcObject) {
            const videoTrack = localVideo.current.srcObject.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    return (
        <div className="video-call-page">
            {/* Header Bar */}
            <div className="video-call-header">
                <div className="video-call-header-left">
                    <div className="video-call-logo">
                        <Video size={20} />
                    </div>
                    <div>
                        <h2 className="video-call-title">Secure P2P Consultation</h2>
                        <span className="video-call-subtitle">Room: {roomId} • End-to-end Encrypted</span>
                    </div>
                </div>
                <button className="video-leave-btn" onClick={handleHangup}>
                    <PhoneOff size={16} />
                    <span>Leave Call</span>
                </button>
            </div>

            {/* Main Video Stage */}
            <div className="video-stage">
                {/* Remote video */}
                <div className="video-remote-container">
                    <video
                        ref={remoteVideo}
                        autoPlay
                        playsInline
                        style={{ display: isRemoteConnected ? 'block' : 'none' }}
                    />
                    {!isRemoteConnected && (
                        <div className="video-waiting-overlay">
                            <div className="telehealth-pulse">
                                <div className="telehealth-pulse-icon">
                                    <Video size={32} color="#3b82f6" />
                                </div>
                            </div>
                            <p className="video-waiting-title">Waiting for the other participant...</p>
                            <p className="video-waiting-room">Room ID: {roomId}</p>
                        </div>
                    )}
                </div>

                {/* Local video */}
                <div className="video-local-container">
                    <video
                        ref={localVideo}
                        autoPlay
                        muted
                        playsInline
                        style={{ transform: 'scaleX(-1)' }}
                    />
                    <div className="video-local-label">You</div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="video-controls-bar">
                <button
                    className={`video-control-btn ${isMuted ? 'active-danger' : ''}`}
                    onClick={toggleAudio}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>
                <button
                    className={`video-control-btn ${isVideoOff ? 'active-danger' : ''}`}
                    onClick={toggleVideo}
                    title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                >
                    {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                </button>
                <button
                    className="video-control-btn hangup"
                    onClick={handleHangup}
                    title="End call"
                >
                    <PhoneOff size={22} />
                </button>
            </div>

            <style>{`
                .video-call-page {
                    height: 100vh;
                    width: 100%;
                    background: #0f172a;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .video-call-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 14px 20px;
                    background: rgba(15, 23, 42, 0.9);
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                    flex-shrink: 0;
                    gap: 12px;
                }

                .video-call-header-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-width: 0;
                }

                .video-call-logo {
                    width: 38px;
                    height: 38px;
                    flex-shrink: 0;
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }

                .video-call-title {
                    margin: 0;
                    font-size: clamp(0.9rem, 2vw, 1.1rem);
                    color: white;
                    font-weight: 700;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .video-call-subtitle {
                    font-size: 0.75rem;
                    color: #64748b;
                    display: block;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .video-leave-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 9px 16px;
                    background: rgba(239, 68, 68, 0.12);
                    border: 1px solid rgba(239, 68, 68, 0.25);
                    border-radius: 10px;
                    color: #ef4444;
                    font-weight: 700;
                    font-size: 0.875rem;
                    cursor: pointer;
                    white-space: nowrap;
                    flex-shrink: 0;
                    transition: all 0.2s;
                }

                .video-leave-btn:hover {
                    background: rgba(239, 68, 68, 0.22);
                }

                /* Mobile: hide text, show only icon */
                @media (max-width: 480px) {
                    .video-leave-btn span { display: none; }
                    .video-leave-btn { padding: 9px 12px; }
                    .video-call-subtitle { display: none; }
                }

                /* Video Stage */
                .video-stage {
                    flex: 1;
                    display: grid;
                    gap: 12px;
                    padding: 12px;
                    overflow: hidden;
                    /* Mobile: stack vertically */
                    grid-template-rows: 1fr 1fr;
                    grid-template-columns: 1fr;
                }

                @media (min-width: 769px) {
                    /* Desktop: side by side */
                    .video-stage {
                        grid-template-rows: 1fr;
                        grid-template-columns: 1fr 1fr;
                        align-items: center;
                    }
                }

                .video-remote-container,
                .video-local-container {
                    position: relative;
                    border-radius: 14px;
                    overflow: hidden;
                    background: #111827;
                    height: 100%;
                    min-height: 0;
                }

                .video-remote-container video,
                .video-local-container video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .video-local-label {
                    position: absolute;
                    bottom: 10px;
                    left: 12px;
                    background: rgba(0,0,0,0.55);
                    color: white;
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 3px 10px;
                    border-radius: 999px;
                    backdrop-filter: blur(4px);
                }

                /* Waiting overlay */
                .video-waiting-overlay {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: #0f172a;
                    color: #64748b;
                    padding: 24px;
                    text-align: center;
                }

                .telehealth-pulse {
                    animation: pulse-blue 2s infinite;
                    border-radius: 50%;
                    margin-bottom: 20px;
                }

                .telehealth-pulse-icon {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    border: 2px solid #3b82f6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(59, 130, 246, 0.1);
                }

                .video-waiting-title {
                    font-size: clamp(0.9rem, 2vw, 1.1rem);
                    font-weight: 500;
                    color: #cbd5e1;
                    margin: 0;
                }

                .video-waiting-room {
                    margin-top: 6px;
                    font-size: 0.8rem;
                    color: #475569;
                }

                /* Controls Bar */
                .video-controls-bar {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 16px;
                    padding: 16px;
                    background: rgba(15, 23, 42, 0.9);
                    border-top: 1px solid rgba(255,255,255,0.08);
                    flex-shrink: 0;
                }

                .video-control-btn {
                    width: 54px;
                    height: 54px;
                    border-radius: 50%;
                    border: 1px solid rgba(255,255,255,0.15);
                    background: rgba(30, 41, 59, 0.85);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    backdrop-filter: blur(8px);
                    transition: all 0.2s;
                }

                .video-control-btn:hover {
                    background: rgba(51, 65, 85, 0.95);
                    border-color: rgba(255,255,255,0.3);
                    transform: translateY(-2px);
                }

                .video-control-btn.active-danger {
                    background: #ef4444;
                    border-color: #ef4444;
                }

                .video-control-btn.hangup {
                    background: #dc2626;
                    border-color: #dc2626;
                    width: 60px;
                    height: 60px;
                }

                .video-control-btn.hangup:hover {
                    background: #b91c1c;
                }

                @media (max-width: 480px) {
                    .video-controls-bar {
                        gap: 12px;
                        padding: 12px;
                    }

                    .video-control-btn {
                        width: 48px;
                        height: 48px;
                    }

                    .video-control-btn.hangup {
                        width: 52px;
                        height: 52px;
                    }
                }

                @keyframes pulse-blue {
                    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
                    70% { box-shadow: 0 0 0 24px rgba(59, 130, 246, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
                }
            `}</style>
        </div>
    );
}
