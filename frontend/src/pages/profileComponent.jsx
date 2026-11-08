import React, { useState, useEffect, useContext } from 'react';
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import { 
    Box, 
    Container, 
    Paper, 
    Typography, 
    Avatar, 
    Button, 
    TextField, 
    Grid, 
    Card, 
    CardContent, 
    Divider, 
    IconButton, 
    Badge, 
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Snackbar,
    Alert
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AuthContext } from '../contexts/AuthContext';
import "../App.css";

function ProfileComponent() {
    const navigate = useNavigate();
    const { getHistoryOfUser } = useContext(AuthContext) || {};

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const userIdentifier = currentUser.uid || currentUser.email || currentUser.name || "default_user";

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [bio, setBio] = useState("");
    const [profilePic, setProfilePic] = useState("");
    const [meetings, setMeetings] = useState([]);
    const [alertMsg, setAlertMsg] = useState("");
    const [alertOpen, setAlertOpen] = useState(false);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const id = user.uid || user.email || user.name || "default_user";
        
        setName(user.name || "User");
        setEmail(user.email || "No email linked");
        
        const savedBio = localStorage.getItem(`user_bio_${id}`) || localStorage.getItem("user_bio");
        setBio(savedBio && !savedBio.includes("শিক্ষার্থী") ? savedBio : "Student & Lifelong Learner | Member of Patshala Virtual Classroom");

        const savedPic = localStorage.getItem(`user_avatar_${id}`) || localStorage.getItem("user_avatar") || user.photoURL;
        setProfilePic(savedPic || "");
    }, []);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                if (getHistoryOfUser) {
                    const history = await getHistoryOfUser();
                    if (Array.isArray(history) && history.length > 0) {
                        setMeetings(history);
                        return;
                    }
                }
                const localHistory = JSON.parse(localStorage.getItem("meeting_history") || "[]");
                if (localHistory.length > 0) {
                    setMeetings(localHistory);
                } else {
                    setMeetings([
                        { 
                            meetingCode: "Math-Class-Room", 
                            date: "Nov 08, 2026", 
                            startTime: "10:30 AM",
                            endTime: "11:15 AM",
                            duration: "45 mins",
                            currentUser: currentUser.name || "User",
                            dialogues: [
                                { sender: currentUser.name || "User", data: "Hello Sir, I have received the lecture notes." },
                                { sender: "Instructor", data: "Welcome! Today we will discuss trigonometry and calculus concepts." }
                            ]
                        }
                    ]);
                }
            } catch (err) {
                console.error("Failed to load meeting history", err);
            }
        };
        fetchHistory();
    }, [getHistoryOfUser]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Data = reader.result;
                setProfilePic(base64Data);
                localStorage.setItem(`user_avatar_${userIdentifier}`, base64Data);
                localStorage.setItem("user_avatar", base64Data);
                
                const updatedUser = { ...currentUser, photoURL: base64Data };
                localStorage.setItem("user", JSON.stringify(updatedUser));
                showAlert("Profile picture updated successfully!");
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = () => {
        const updatedUser = { ...currentUser, name: name };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        localStorage.setItem(`user_bio_${userIdentifier}`, bio);
        localStorage.setItem("user_bio", bio);
        setIsEditing(false);
        showAlert("Profile details updated successfully!");
    };

    const showAlert = (msg) => {
        setAlertMsg(msg);
        setAlertOpen(true);
    };

    // পিডিএফ ডাউনলোড হ্যান্ডলার
    const downloadMeetingPDF = (meeting) => {
        const doc = new jsPDF();

        doc.setFillColor(255, 152, 57);
        doc.rect(0, 0, 210, 24, 'F');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text("PATSHALA - MEETING SUMMARY & TRANSCRIPT", 14, 16);

        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        doc.text(`Room Code   : ${meeting.meetingCode || meeting}`, 14, 34);
        doc.text(`Date        : ${meeting.date || "Recent"}`, 14, 42);
        doc.text(`Time        : ${meeting.startTime || 'N/A'} - ${meeting.endTime || 'N/A'} (${meeting.duration || 'N/A'})`, 14, 50);
        doc.text(`Participant : ${meeting.currentUser || name || "User"}`, 14, 58);

        doc.setLineWidth(0.4);
        doc.setDrawColor(210, 210, 210);
        doc.line(14, 63, 196, 63);

        const tableBody = (meeting.dialogues && meeting.dialogues.length > 0)
            ? meeting.dialogues.map((item, idx) => [
                idx + 1,
                item.sender || "Participant",
                item.data || ""
            ])
            : [[ "-", "Notice", "No dialogue or chat messages recorded during this meeting session." ]];

        doc.autoTable({
            startY: 68,
            head: [['#', 'Speaker', 'Dialogue / Message Note']],
            body: tableBody,
            headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { cellWidth: 45, fontStyle: 'bold' },
                2: { cellWidth: 'auto' }
            },
            styles: { fontSize: 9.5, cellPadding: 3.5, overflow: 'linebreak' }
        });

        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(140, 140, 140);
            doc.text(`Page ${i} of ${totalPages} | Patshala Classroom Transcript`, 14, 290);
        }

        doc.save(`${meeting.meetingCode || 'Meeting'}_Transcript.pdf`);
    };

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc', pb: 6 }}>
            {/* Top Navigation Bar */}
            <Box sx={{ 
                px: { xs: 2, md: 5 }, 
                py: 2, 
                backgroundColor: 'rgba(15, 23, 42, 0.85)', 
                backdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(255,255,255,0.08)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                position: 'sticky', 
                top: 0, 
                zIndex: 10 
            }}>
                <Button 
                    startIcon={<ArrowBackIcon />} 
                    onClick={() => navigate("/home")} 
                    sx={{ color: '#FF9839', textTransform: 'none', fontWeight: 600 }} 
                >
                    Back to Home
                </Button>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc', letterSpacing: '0.5px' }}>
                    User Profile
                </Typography>
                <Button 
                    variant="contained" 
                    startIcon={<VideoCallIcon />} 
                    onClick={() => navigate("/home")} 
                    sx={{ 
                        backgroundColor: '#FF9839', 
                        '&:hover': { backgroundColor: '#e0852e' }, 
                        textTransform: 'none',
                        fontWeight: 600
                    }} 
                >
                    New Meeting
                </Button>
            </Box>

            <Container maxWidth="lg" sx={{ mt: 4 }}>
                {/* Profile Header Banner Card */}
                <Paper elevation={4} sx={{ 
                    borderRadius: 3, 
                    overflow: 'hidden', 
                    backgroundColor: '#111827', 
                    color: '#fff', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                }}>
                    <Box sx={{ 
                        height: { xs: 150, sm: 220 }, 
                        background: 'linear-gradient(135deg, #FF9839 0%, #db2777 50%, #4f46e5 100%)', 
                        position: 'relative' 
                    }} />

                    <Box sx={{ px: { xs: 2, sm: 4 }, pb: 3 }}>
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'column', sm: 'row' }, 
                            alignItems: { xs: 'center', sm: 'flex-start' }, 
                            gap: 3 
                        }}>
                            {/* Avatar with Camera Action */}
                            <Box sx={{ marginTop: { xs: '-65px', sm: '-75px' }, zIndex: 2 }}>
                                <Badge
                                    overlap="circular"
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    badgeContent={
                                        <label htmlFor="upload-avatar">
                                            <input
                                                accept="image/*"
                                                id="upload-avatar"
                                                type="file"
                                                style={{ display: 'none' }}
                                                onChange={handleImageChange}
                                            />
                                            <IconButton 
                                                component="span" 
                                                sx={{ 
                                                    backgroundColor: '#FF9839', 
                                                    color: '#fff', 
                                                    border: '2px solid #111827', 
                                                    '&:hover': { backgroundColor: '#e0852e' }, 
                                                    p: 1 
                                                }}
                                            >
                                                <PhotoCameraIcon fontSize="small" />
                                            </IconButton>
                                        </label>
                                    }
                                >
                                    <Avatar 
                                        src={profilePic} 
                                        alt={name} 
                                        sx={{ 
                                            width: { xs: 125, sm: 145 }, 
                                            height: { xs: 125, sm: 145 }, 
                                            border: '4px solid #111827', 
                                            fontSize: 48, 
                                            bgcolor: '#2563eb',
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                                        }}
                                    >
                                        {name ? name[0]?.toUpperCase() : "U"}
                                    </Avatar>
                                </Badge>
                            </Box>

                            {/* User Bio Details (সঠিক মার্জিন ও প্যাডিং দিয়ে নাম স্পষ্ট করা হয়েছে) */}
                            <Box sx={{ flexGrow: 1, pt: { xs: 0, sm: 2 }, textAlign: { xs: 'center', sm: 'left' } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start' }, gap: 1 }}>
                                    <Typography 
                                        variant="h5" 
                                        sx={{ 
                                            fontWeight: 800, 
                                            color: '#f8fafc',
                                            lineHeight: 1.3,
                                            wordBreak: 'break-word'
                                        }}
                                    >
                                        {name}
                                    </Typography>
                                    <CheckCircleIcon sx={{ color: '#38bdf8', fontSize: 22 }} titleAccess="Verified User" />
                                </Box>
                                <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                                    {email}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 1, fontStyle: 'italic', maxWidth: 650 }}>
                                    "{bio}"
                                </Typography>
                            </Box>

                            {/* Edit Action Button */}
                            <Box sx={{ pt: { xs: 0, sm: 2 } }}>
                                {!isEditing ? (
                                    <Button 
                                        variant="outlined" 
                                        startIcon={<EditIcon />} 
                                        onClick={() => setIsEditing(true)} 
                                        sx={{ 
                                            borderColor: 'rgba(255,255,255,0.2)', 
                                            color: '#f8fafc', 
                                            textTransform: 'none', 
                                            fontWeight: 600,
                                            '&:hover': { borderColor: '#FF9839', backgroundColor: 'rgba(255,152,57,0.1)' } 
                                        }} 
                                    >
                                        Edit Profile
                                    </Button>
                                ) : (
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button 
                                            variant="contained" 
                                            startIcon={<SaveIcon />} 
                                            onClick={handleSaveProfile} 
                                            sx={{ backgroundColor: '#22c55e', '&:hover': { backgroundColor: '#16a34a' }, textTransform: 'none', fontWeight: 600 }} 
                                        >
                                            Save
                                        </Button>
                                        <Button 
                                            variant="outlined" 
                                            startIcon={<CancelIcon />} 
                                            onClick={() => setIsEditing(false)} 
                                            sx={{ color: '#ef4444', borderColor: '#ef4444', textTransform: 'none', fontWeight: 600 }} 
                                        >
                                            Cancel
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        </Box>

                        {/* Inline Profile Editing Form */}
                        {isEditing && (
                            <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                <Typography variant="subtitle1" sx={{ mb: 2, color: '#FF9839', fontWeight: 700 }}>
                                    Edit Profile Information
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField 
                                            fullWidth 
                                            label="Full Name" 
                                            value={name} 
                                            onChange={(e) => setName(e.target.value)} 
                                            size="small" 
                                            sx={{ 
                                                input: { color: 'white' }, 
                                                label: { color: '#94a3b8' }, 
                                                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' } } 
                                            }} 
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField 
                                            fullWidth 
                                            label="Short Bio" 
                                            value={bio} 
                                            onChange={(e) => setBio(e.target.value)} 
                                            size="small" 
                                            sx={{ 
                                                input: { color: 'white' }, 
                                                label: { color: '#94a3b8' }, 
                                                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' } } 
                                            }} 
                                        />
                                    </Grid>
                                </Grid>
                            </Box>
                        )}
                    </Box>
                </Paper>

                {/* Dashboard Metric Overview Cards */}
                <Grid container spacing={3} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={4}>
                        <Card sx={{ bgcolor: '#111827', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
                            <CardContent>
                                <Typography variant="overline" sx={{ color: '#94a3b8', fontWeight: 600, letterSpacing: '1px' }}>
                                    TOTAL MEETINGS ATTENDED
                                </Typography>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: '#FF9839', mt: 1 }}>
                                    {meetings.length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Card sx={{ bgcolor: '#111827', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
                            <CardContent>
                                <Typography variant="overline" sx={{ color: '#94a3b8', fontWeight: 600, letterSpacing: '1px' }}>
                                    ACCOUNT TYPE
                                </Typography>
                                <Box sx={{ mt: 1.5 }}>
                                    <Chip label="Verified Member" color="success" size="small" sx={{ fontWeight: 600 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Card sx={{ bgcolor: '#111827', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
                            <CardContent>
                                <Typography variant="overline" sx={{ color: '#94a3b8', fontWeight: 600, letterSpacing: '1px' }}>
                                    STATUS
                                </Typography>
                                <Box sx={{ mt: 1.5 }}>
                                    <Chip 
                                        label="Active Now" 
                                        sx={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 600 }} 
                                        size="small" 
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Previous Meeting Records Table (Re-join বাটন সরানো হয়েছে) */}
                <Paper elevation={3} sx={{ 
                    mt: 3, 
                    p: 3, 
                    borderRadius: 3, 
                    backgroundColor: '#111827', 
                    color: '#fff', 
                    border: '1px solid rgba(255,255,255,0.08)' 
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                        <HistoryIcon sx={{ color: '#FF9839' }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                            Recent Meetings & Classroom Transcripts
                        </Typography>
                    </Box>
                    <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.08)' }} />

                    {meetings.length === 0 ? (
                        <Typography sx={{ color: '#94a3b8', textAlign: 'center', py: 4 }}>
                            No classroom or meeting sessions attended yet.
                        </Typography>
                    ) : (
                        <TableContainer>
                            <Table sx={{ minWidth: 600 }}>
                                <TableHead>
                                    <TableRow sx={{ '& th': { color: '#94a3b8', borderColor: 'rgba(255,255,255,0.08)', fontWeight: 600 } }}>
                                        <TableCell>Room Code</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Time / Duration</TableCell>
                                        <TableCell align="right">Summary</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {meetings.map((item, index) => (
                                        <TableRow key={index} sx={{ '& td': { color: '#f8fafc', borderColor: 'rgba(255,255,255,0.04)' } }}>
                                            <TableCell sx={{ fontWeight: 700, color: '#FF9839' }}>
                                                {item.meetingCode || item}
                                            </TableCell>
                                            <TableCell sx={{ color: '#94a3b8' }}>
                                                {item.date || "Recent"}
                                            </TableCell>
                                            <TableCell sx={{ color: '#94a3b8' }}>
                                                {item.startTime ? `${item.startTime} (${item.duration})` : (item.duration || "Completed")}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Button 
                                                    size="small" 
                                                    variant="contained" 
                                                    startIcon={<PictureAsPdfIcon fontSize="small" />}
                                                    onClick={() => downloadMeetingPDF(item)}
                                                    sx={{ 
                                                        bgcolor: '#FF9839', 
                                                        color: '#fff', 
                                                        textTransform: 'none', 
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600,
                                                        px: 2,
                                                        '&:hover': { bgcolor: '#e0852e' } 
                                                    }} 
                                                >
                                                    Download PDF
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            </Container>

            {/* Notification Toast */}
            <Snackbar
                open={alertOpen}
                autoHideDuration={3000}
                onClose={() => setAlertOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setAlertOpen(false)} severity="success" sx={{ width: '100%', bgcolor: '#16a34a', color: '#fff', fontWeight: 600 }}>
                    {alertMsg}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default withAuth(ProfileComponent);