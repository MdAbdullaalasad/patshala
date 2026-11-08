import React, { useEffect, useRef, useState } from 'react';
import io from "socket.io-client";
import { Badge, IconButton, TextField, Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import styles from "../styles/videoComponent.module.css";
import server from '../environment';

const server_url = server;
var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
};

export default function VideoMeetComponent() {
    var socketRef = useRef();
    let socketIdRef = useRef();
    let localVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);

    let [video, setVideo] = useState(true);
    let [audio, setAudio] = useState(true);
    let [screen, setScreen] = useState(false);

    let [showModal, setModal] = useState(false);
    let [screenAvailable, setScreenAvailable] = useState(false);

    let [messages, setMessages] = useState([]);
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);

    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState("");
    
    // মিটিংয়ের সঠিক টাইমিং হিসাব রাখার স্টেট
    let [meetingStartTime, setMeetingStartTime] = useState(null);

    const videoRef = useRef([]);
    let [videos, setVideos] = useState([]);

    useEffect(() => {
        getPermissions();
    }, []);

    useEffect(() => {
        if (screen) {
            getDislayMedia();
        }
    }, [screen]);

    const getPermissions = async () => {
        try {
            const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (userMediaStream) {
                setVideoAvailable(true);
                setAudioAvailable(true);
                window.localStream = userMediaStream;
                if (localVideoref.current) {
                    localVideoref.current.srcObject = userMediaStream;
                }
            }

            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }
        } catch (error) {
            console.error("Camera/Mic Permission Error:", error);
            setVideoAvailable(false);
            setAudioAvailable(false);
        }
    };

    let getDislayMedia = () => {
        if (navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                .then(getDislayMediaSuccess)
                .catch((e) => {
                    console.log(e);
                    setScreen(false);
                });
        }
    };

    let getUserMediaSuccess = (stream) => {
        try {
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
            }
        } catch (e) { console.log(e); }

        window.localStream = stream;
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
        }

        for (let id in connections) {
            if (id === socketIdRef.current) continue;

            connections[id].addStream(window.localStream);

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                    })
                    .catch(e => console.log(e));
            });
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);

            try {
                let tracks = localVideoref.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            } catch (e) { console.log(e); }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            if (localVideoref.current) {
                localVideoref.current.srcObject = window.localStream;
            }

            for (let id in connections) {
                connections[id].addStream(window.localStream);

                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                        })
                        .catch(e => console.log(e));
                });
            }
        });
    };

    let getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .catch((e) => console.log(e));
        } else {
            try {
                let tracks = localVideoref.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            } catch (e) { }
        }
    };

    let getDislayMediaSuccess = (stream) => {
        try {
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
            }
        } catch (e) { console.log(e); }

        window.localStream = stream;
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
        }

        for (let id in connections) {
            if (id === socketIdRef.current) continue;

            connections[id].addStream(window.localStream);

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                    })
                    .catch(e => console.log(e));
            });
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false);

            try {
                let tracks = localVideoref.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            } catch (e) { console.log(e); }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            if (localVideoref.current) {
                localVideoref.current.srcObject = window.localStream;
            }

            getUserMedia();
        });
    };

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message);

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }));
                            }).catch(e => console.log(e));
                        }).catch(e => console.log(e));
                    }
                }).catch(e => console.log(e));
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
            }
        }
    };

    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false });

        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.href);
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((v) => v.socketId !== id));
            });

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {
                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }));
                        }
                    };

                    connections[socketListId].onaddstream = (event) => {
                        let videoExists = videoRef.current.find(v => v.socketId === socketListId);

                        if (videoExists) {
                            setVideos(videos => {
                                const updatedVideos = videos.map(v =>
                                    v.socketId === socketListId ? { ...v, stream: event.stream } : v
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else {
                            let newVideo = {
                                socketId: socketListId,
                                stream: event.stream,
                                autoplay: true,
                                playsinline: true
                            };

                            setVideos(videos => {
                                const updatedVideos = [...videos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        }
                    };

                    if (window.localStream !== undefined && window.localStream !== null) {
                        connections[socketListId].addStream(window.localStream);
                    } else {
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
                        window.localStream = blackSilence();
                        connections[socketListId].addStream(window.localStream);
                    }
                });

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue;

                        try {
                            connections[id2].addStream(window.localStream);
                        } catch (e) { }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }));
                                });
                        }).catch(e => console.log(e));
                    }
                }
            });
        });
    };

    let silence = () => {
        let ctx = new AudioContext();
        let oscillator = ctx.createOscillator();
        let dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        ctx.resume();
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
    };

    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height });
        canvas.getContext('2d').fillRect(0, 0, width, height);
        let stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], { enabled: false });
    };

    let handleAudio = () => {
        if (window.localStream) {
            const audioTrack = window.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setAudio(audioTrack.enabled);
            }
        }
    };

    let handleVideo = () => {
        if (window.localStream) {
            const videoTrack = window.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setVideo(videoTrack.enabled);
            }
        }
    };

    let handleScreen = () => {
        setScreen(!screen);
    };

    // কল কেটে ডায়ালগ, রুম কোড ও সময় হিস্ট্রিতে সেভ করা
    let handleEndCall = () => {
        try {
            const endTime = new Date();
            const startTime = meetingStartTime || new Date();

            const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
            const formattedDuration = durationMinutes < 1 ? "1 min" : `${durationMinutes} mins`;

            const pathParts = window.location.pathname.split("/").filter(Boolean);
            const roomCode = pathParts[pathParts.length - 1] || "Meeting-Room";

            const newMeetingRecord = {
                id: `meeting-${Date.now()}`,
                meetingCode: roomCode,
                date: startTime.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
                startTime: startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                endTime: endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                duration: formattedDuration,
                currentUser: username || "User",
                dialogues: messages
            };

            const existingHistory = JSON.parse(localStorage.getItem("meeting_history") || "[]");
            existingHistory.unshift(newMeetingRecord);
            localStorage.setItem("meeting_history", JSON.stringify(existingHistory));

            if (localVideoref.current && localVideoref.current.srcObject) {
                let tracks = localVideoref.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        } catch (e) {
            console.error("Failed to save meeting record:", e);
        }

        window.location.href = "/history";
    };

    let handleMessage = (e) => {
        setMessage(e.target.value);
    };

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };

    let sendMessage = () => {
        if (socketRef.current && message.trim() !== "") {
            socketRef.current.emit('chat-message', message, username);
            setMessage("");
        }
    };

    let getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    };

    let connect = () => {
        setAskForUsername(false);
        setMeetingStartTime(new Date());

        setTimeout(() => {
            if (localVideoref.current && window.localStream) {
                localVideoref.current.srcObject = window.localStream;
            }
        }, 150);

        getMedia();
    };

    return (
        <div>
            {askForUsername === true ? (
                <div style={{
                    minHeight: "100vh",
                    background: "radial-gradient(circle at center, #111827 0%, #030712 100%)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "white"
                }}>
                    <div style={{
                        background: "rgba(255, 255, 255, 0.04)",
                        backdropFilter: "blur(20px)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        padding: "40px",
                        borderRadius: "24px",
                        textAlign: "center",
                        maxWidth: "460px",
                        width: "90%",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
                    }}>
                        <h2 style={{ marginBottom: "20px", fontWeight: "700" }}>Enter into Lobby</h2>
                        <div style={{ width: "100%", height: "240px", borderRadius: "16px", overflow: "hidden", marginBottom: "20px", background: "#000" }}>
                            <video 
                                ref={localVideoref} 
                                autoPlay 
                                muted 
                                playsInline 
                                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                            />
                        </div>
                        <TextField 
                            fullWidth 
                            label="Username" 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            variant="outlined" 
                            sx={{
                                mb: 2,
                                input: { color: 'white' },
                                label: { color: '#9ca3af' },
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                    '&:hover fieldset': { borderColor: '#FF9839' },
                                    '&.Mui-focused fieldset': { borderColor: '#FF9839' }
                                }
                            }}
                        />
                        <Button 
                            fullWidth 
                            variant="contained" 
                            onClick={connect}
                            sx={{
                                bgcolor: "#FF9839",
                                py: 1.4,
                                borderRadius: "12px",
                                fontWeight: "700",
                                fontSize: "1rem",
                                textTransform: "none",
                                '&:hover': { bgcolor: "#e0852e" }
                            }}
                        >
                            Connect
                        </Button>
                    </div>
                </div>
            ) : (
                <div className={styles.meetVideoContainer}>
                    {/* অপোনেন্টের ভিডিও (স্ক্রিন জুড়ে বড় হবে) */}
                    <div className={styles.conferenceView}>
                        {videos.length === 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                                <p style={{ fontSize: "1.2rem", fontWeight: "600" }}>Waiting for others to join...</p>
                            </div>
                        ) : (
                            videos.map((v) => (
                                <div key={v.socketId}>
                                    <video
                                        data-socket={v.socketId}
                                        ref={ref => {
                                            if (ref && v.stream) {
                                                ref.srcObject = v.stream;
                                            }
                                        }}
                                        autoPlay
                                        playsInline
                                    />
                                </div>
                            ))
                        )}
                    </div>

                    {/* নিজের ভিডিও (বড় প্রিমিয়াম ফ্রেম) */}
                    <video 
                        className={styles.meetUserVideo} 
                        ref={localVideoref} 
                        autoPlay 
                        muted 
                        playsInline 
                    />

                    {/* চ্যাট উইন্ডো */}
                    {showModal && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <div className={styles.chatHeader}>
                                    <h2>In-Call Messages</h2>
                                </div>
                                <div className={styles.chattingDisplay}>
                                    {messages.length !== 0 ? messages.map((item, index) => (
                                        <div className={styles.messageItem} key={index}>
                                            <p className={styles.senderName}>{item.sender}</p>
                                            <p className={styles.messageText}>{item.data}</p>
                                        </div>
                                    )) : (
                                        <p className={styles.noMessages}>No messages yet.</p>
                                    )}
                                </div>

                                <div className={styles.chattingArea}>
                                    <TextField 
                                        fullWidth
                                        size="small"
                                        placeholder="Enter your chat..."
                                        value={message} 
                                        onChange={handleMessage} 
                                        onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                                        sx={{
                                            input: { color: 'white', fontSize: "0.9rem" },
                                            '& .MuiOutlinedInput-root': {
                                                bgcolor: 'rgba(255,255,255,0.05)',
                                                borderRadius: '10px',
                                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' },
                                                '&:hover fieldset': { borderColor: '#FF9839' },
                                                '&.Mui-focused fieldset': { borderColor: '#FF9839' }
                                            }
                                        }}
                                    />
                                    <Button className={styles.sendBtn} onClick={sendMessage}>
                                        Send
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* নিচের কন্ট্রোল বাটনবার */}
                    <div className={styles.buttonContainers}>
                        <IconButton className={styles.controlBtn} onClick={handleVideo}>
                            {video ? <VideocamIcon /> : <VideocamOffIcon sx={{ color: "#ef4444" }} />}
                        </IconButton>

                        <IconButton className={styles.controlBtn} onClick={handleAudio}>
                            {audio ? <MicIcon /> : <MicOffIcon sx={{ color: "#ef4444" }} />}
                        </IconButton>

                        {screenAvailable && (
                            <IconButton className={styles.controlBtn} onClick={handleScreen}>
                                {screen ? <StopScreenShareIcon sx={{ color: "#FF9839" }} /> : <ScreenShareIcon />}
                            </IconButton>
                        )}

                        <Badge badgeContent={newMessages} color="primary">
                            <IconButton className={styles.controlBtn} onClick={() => { setModal(!showModal); setNewMessages(0); }}>
                                <ChatIcon />
                            </IconButton>
                        </Badge>

                        <IconButton className={styles.endCallBtn} onClick={handleEndCall}>
                            <CallEndIcon />
                        </IconButton>
                    </div>
                </div>
            )}
        </div>
    );
}