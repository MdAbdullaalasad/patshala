import React, { useContext, useState } from 'react';
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import { Button, IconButton, TextField, InputAdornment, Avatar } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import LogoutIcon from '@mui/icons-material/Logout';
import { AuthContext } from '../contexts/AuthContext';
import "../App.css";

function HomeComponent() {
    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const { addToUserHistory } = useContext(AuthContext);

    // ইউজারের নাম বা ছবি থাকলে তা নিয়ে আসা
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const userAvatar = localStorage.getItem("user_avatar") || storedUser.photoURL || "";

    let handleJoinVideoCall = async () => {
        if (!meetingCode.trim()) return alert("অনুগ্রহ করে একটি মিটিং কোড দিন!");
        if (addToUserHistory) await addToUserHistory(meetingCode);
        navigate(`/${meetingCode}`);
    };

    // সরাসরি ল্যান্ডিং পেজে (/) নিয়ে যাওয়ার লগআউট ফাংশন
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("user_avatar");
        localStorage.removeItem("user_bio");
        navigate("/"); // ল্যান্ডিং পেজের পাথ
    };

    return (
        <div className="homeContainer">
            {/* Top Navbar */}
            <div className="navBar">
                <div style={{ display: "flex", alignItems: "center" }}>
                    <h2 className='brandLogoHeading'>
                        <img 
                            src='/icon1.png' 
                            alt="Patshala Logo" 
                            className='brandLogoImg'
                        /> 
                        Patshala
                    </h2>
                </div>

                <div className="navActions" style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                    {/* User Profile Button */}
                    <div 
                        className="historyBtn" 
                        onClick={() => navigate("/profile")}
                        style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                    >
                        <Avatar 
                            src={userAvatar} 
                            sx={{ width: 30, height: 30, bgcolor: "#FF9839", fontSize: 14 }}
                        >
                            {storedUser.name ? storedUser.name[0]?.toUpperCase() : "P"}
                        </Avatar>
                        <p className="historyText">Profile</p>
                    </div>

                    {/* History Button */}
                    <div className="historyBtn" onClick={() => navigate("/history")}>
                        <IconButton size="small" style={{ color: "#FF9839", padding: 0 }}>
                            <RestoreIcon />
                        </IconButton>
                        <p className="historyText">History</p>
                    </div>

                    {/* Logout Button */}
                    <Button 
                        className="logoutBtn"
                        onClick={handleLogout}
                        startIcon={<LogoutIcon />}
                    >
                        Logout
                    </Button>
                </div>
            </div>

            {/* Hero Section */}
            <div className="meetContainer">
                <div className="leftPanel">
                    <div className="heroCard">
                        <h2 className="heroHeading">
                            Providing Quality Video Call <br />
                            <span className="heroHeadingSpan">Just Like Quality Education</span>
                        </h2>
                        <p className="heroSubtext">
                            Connect seamlessly with your teachers and students in real-time. Enter a room code below to jump right into the classroom.
                        </p>

                        <div className="joinInputGroup">
                            <TextField 
                                fullWidth
                                onChange={e => setMeetingCode(e.target.value)} 
                                value={meetingCode}
                                id="outlined-basic" 
                                label="Enter Meeting Code" 
                                variant="outlined"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <VideoCallIcon style={{ color: '#FF9839' }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ 
                                    input: { color: 'white' }, 
                                    label: { color: '#94a3b8' },
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                        '&:hover fieldset': { borderColor: '#FF9839' },
                                        '&.Mui-focused fieldset': { borderColor: '#FF9839' },
                                    }
                                }}
                            />
                            <Button 
                                className="joinBtn"
                                onClick={handleJoinVideoCall} 
                                variant='contained'
                            >
                                Join Room
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="rightPanel">
                    <div className="heroImageContainer">
                        <img className="heroImage" src='/mobile.png' alt="Pathshala Video Call" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default withAuth(HomeComponent);