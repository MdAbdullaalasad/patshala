import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Button,
    Divider,
    Grid,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ChatIcon from '@mui/icons-material/Chat';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AuthContext } from '../contexts/AuthContext';
import "../App.css";

export default function History() {
    const navigate = useNavigate();
    const { getHistoryOfUser } = useContext(AuthContext) || {};

    const [historyList, setHistoryList] = useState([]);
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [meetingToDelete, setMeetingToDelete] = useState(null);
    const [toastOpen, setToastOpen] = useState(false);

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const currentUserName = currentUser.name || "User";

    useEffect(() => {
        const loadHistory = async () => {
            const localHistory = localStorage.getItem("meeting_history");

            if (localHistory !== null) {
                setHistoryList(JSON.parse(localHistory));
                return;
            }

            try {
                if (getHistoryOfUser) {
                    const serverHistory = await getHistoryOfUser();
                    if (Array.isArray(serverHistory) && serverHistory.length > 0) {
                        setHistoryList(serverHistory);
                        return;
                    }
                }
            } catch (err) {
                console.error("Error fetching server history:", err);
            }

            const defaultData = [
                {
                    id: "demo-meeting-1",
                    meetingCode: "Math-Class-Room",
                    date: "Nov 08, 2026",
                    startTime: "10:30 AM",
                    endTime: "11:15 AM",
                    duration: "45 mins",
                    currentUser: currentUserName,
                    dialogues: [
                        { sender: currentUserName, data: "Hello Sir, I have received the lecture notes." },
                        { sender: "Rahim Teacher", data: "Welcome! Today we will discuss trigonometry and calculus concepts." },
                        { sender: currentUserName, data: "Sir, could you please clarify the third formula once more?" },
                        { sender: "Rahim Teacher", data: "Sure, let me illustrate it on the whiteboard." }
                    ]
                }
            ];
            setHistoryList(defaultData);
            localStorage.setItem("meeting_history", JSON.stringify(defaultData));
        };

        loadHistory();
    }, [getHistoryOfUser, currentUserName]);

    // মিটিং ডিলিট হ্যান্ডলার
    const confirmDelete = (meeting) => {
        setMeetingToDelete(meeting);
        setDeleteModalOpen(true);
    };

    const handleDeleteMeeting = () => {
        if (!meetingToDelete) return;

        const updatedList = historyList.filter((m) => {
            if (meetingToDelete.id && m.id) {
                return m.id !== meetingToDelete.id;
            }
            return (m.meetingCode || m) !== (meetingToDelete.meetingCode || meetingToDelete);
        });

        setHistoryList(updatedList);
        localStorage.setItem("meeting_history", JSON.stringify(updatedList));

        if (selectedMeeting && (selectedMeeting.id === meetingToDelete.id || selectedMeeting.meetingCode === meetingToDelete.meetingCode)) {
            setDialogOpen(false);
            setSelectedMeeting(null);
        }

        setDeleteModalOpen(false);
        setMeetingToDelete(null);
        setToastOpen(true);
    };

    // পিডিএফ ডাউনলোড
    const downloadMeetingPDF = (meeting) => {
        const doc = new jsPDF();

        doc.setFillColor(255, 152, 57);
        doc.rect(0, 0, 210, 24, 'F');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text("PATSHALA - MEETING SUMMARY & DIALOGUE RECORD", 14, 16);

        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        doc.text(`Room Code    : ${meeting.meetingCode || meeting}`, 14, 34);
        doc.text(`Meeting Date : ${meeting.date || "N/A"}`, 14, 42);
        doc.text(`Meeting Time : ${meeting.startTime || 'N/A'} - ${meeting.endTime || 'N/A'} (Duration: ${meeting.duration || 'N/A'})`, 14, 50);
        doc.text(`Participant  : ${meeting.currentUser || currentUserName}`, 14, 58);

        doc.setLineWidth(0.4);
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 63, 196, 63);

        const tableBody = (meeting.dialogues && meeting.dialogues.length > 0)
            ? meeting.dialogues.map((item, idx) => [
                idx + 1,
                item.sender || "Participant",
                item.data || ""
            ])
            : [[ "-", "Notice", "No spoken chat dialogue was recorded during this meeting session." ]];

        doc.autoTable({
            startY: 68,
            head: [['#', 'Speaker Name', 'Dialogue / Message Note']],
            body: tableBody,
            headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { cellWidth: 50, fontStyle: 'bold' },
                2: { cellWidth: 'auto' }
            },
            styles: {
                fontSize: 9.5,
                cellPadding: 4,
                overflow: 'linebreak'
            }
        });

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8.5);
            doc.setTextColor(140, 140, 140);
            doc.text(`Page ${i} of ${pageCount} | Official Transcript - Patshala Video Platform`, 14, 290);
        }

        doc.save(`${meeting.meetingCode || 'Meeting'}_Summary_${Date.now()}.pdf`);
    };

    const handleOpenDialogues = (meeting) => {
        setSelectedMeeting(meeting);
        setDialogOpen(true);
    };

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: '#0d1117', color: '#ffffff', pb: 6 }}>
            {/* Top Navigation Bar */}
            <Box sx={{
                px: { xs: 2, md: 5 },
                py: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate("/home")}
                    sx={{ color: '#FF9839', textTransform: 'none', fontWeight: 600 }}
                >
                    Back to Home
                </Button>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                    Meeting History & Transcripts
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<VideoCallIcon />}
                    onClick={() => navigate("/home")}
                    sx={{ borderColor: '#FF9839', color: '#FF9839', textTransform: 'none' }}
                >
                    New Call
                </Button>
            </Box>

            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                    Meeting Summaries & Transcripts
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                    Review your conversation logs by speaker name, check duration, download formal PDF transcripts, or delete meeting logs.
                </Typography>

                {historyList.length === 0 ? (
                    <Card sx={{ bgcolor: '#161b22', p: 6, textAlign: 'center', borderRadius: 3, border: '1px dashed rgba(255,255,255,0.15)' }}>
                        <Typography variant="h6" sx={{ color: '#cbd5e1', fontWeight: 600, mb: 1 }}>
                            No recorded meeting sessions found
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                            Your history is currently empty. Start a new video call to record dialogues and notes.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<VideoCallIcon />}
                            onClick={() => navigate("/home")}
                            sx={{ bgcolor: '#FF9839', textTransform: 'none', '&:hover': { bgcolor: '#e07b18' } }}
                        >
                            Start a Meeting
                        </Button>
                    </Card>
                ) : (
                    <Grid container spacing={3}>
                        {historyList.map((item, idx) => (
                            <Grid item xs={12} key={item.id || idx}>
                                <Card sx={{
                                    bgcolor: '#161b22',
                                    borderRadius: 3,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#fff',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                                    transition: 'transform 0.2s ease, border-color 0.2s ease',
                                    '&:hover': {
                                        borderColor: 'rgba(255, 152, 57, 0.3)'
                                    }
                                }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                                            <Box>
                                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                                                    Room: <span style={{ color: '#FF9839' }}>{item.meetingCode || item}</span>
                                                </Typography>

                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
                                                    <Chip
                                                        icon={<CalendarMonthIcon sx={{ color: '#FF9839 !important', fontSize: 16 }} />}
                                                        label={item.date || "Recent"}
                                                        size="small"
                                                        sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#cbd5e1' }}
                                                    />
                                                    <Chip
                                                        icon={<AccessTimeIcon sx={{ color: '#FF9839 !important', fontSize: 16 }} />}
                                                        label={item.startTime ? `${item.startTime} - ${item.endTime || ''} (${item.duration})` : (item.duration || "Completed")}
                                                        size="small"
                                                        sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: '#cbd5e1' }}
                                                    />
                                                </Box>
                                            </Box>

                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<ChatIcon />}
                                                    onClick={() => handleOpenDialogues(item)}
                                                    sx={{
                                                        borderColor: 'rgba(255,255,255,0.2)',
                                                        color: '#f8fafc',
                                                        textTransform: 'none',
                                                        '&:hover': { borderColor: '#FF9839' }
                                                    }}
                                                >
                                                    View Dialogues
                                                </Button>

                                                <Button
                                                    variant="contained"
                                                    startIcon={<PictureAsPdfIcon />}
                                                    onClick={() => downloadMeetingPDF(item)}
                                                    sx={{
                                                        bgcolor: '#FF9839',
                                                        color: '#fff',
                                                        textTransform: 'none',
                                                        fontWeight: 600,
                                                        '&:hover': { bgcolor: '#e07b18' }
                                                    }}
                                                >
                                                    PDF Summary
                                                </Button>

                                                <Button
                                                    variant="outlined"
                                                    startIcon={<DeleteOutlineIcon />}
                                                    onClick={() => confirmDelete(item)}
                                                    sx={{
                                                        borderColor: 'rgba(239, 68, 68, 0.4)',
                                                        color: '#ef4444',
                                                        textTransform: 'none',
                                                        fontWeight: 600,
                                                        '&:hover': {
                                                            borderColor: '#ef4444',
                                                            bgcolor: 'rgba(239, 68, 68, 0.1)'
                                                        }
                                                    }}
                                                >
                                                    Delete
                                                </Button>
                                            </Box>
                                        </Box>

                                        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />

                                        <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 1 }}>
                                            Dialogue Preview ({item.dialogues?.length || 0} messages):
                                        </Typography>

                                        <Box sx={{ bgcolor: 'rgba(0,0,0,0.25)', p: 2, borderRadius: 2 }}>
                                            {item.dialogues && item.dialogues.length > 0 ? (
                                                item.dialogues.slice(0, 2).map((dlg, dIdx) => (
                                                    <Typography key={dIdx} variant="body2" sx={{ mb: 0.5, color: '#e2e8f0' }}>
                                                        <strong style={{ color: dlg.sender === (item.currentUser || currentUserName) ? '#FF9839' : '#60a5fa' }}>
                                                            {dlg.sender}: 
                                                        </strong>{" "}
                                                        {dlg.data}
                                                    </Typography>
                                                ))
                                            ) : (
                                                <Typography variant="body2" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                                                    No dialogue messages were recorded for this meeting.
                                                </Typography>
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Container>

            {/* Dialogues Modal */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { bgcolor: '#161b22', color: '#fff', borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)' }
                }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    Meeting Dialogue Notes ({selectedMeeting?.meetingCode})
                </DialogTitle>
                <DialogContent sx={{ mt: 2, maxHeight: '60vh', overflowY: 'auto' }}>
                    {selectedMeeting?.dialogues && selectedMeeting.dialogues.length > 0 ? (
                        selectedMeeting.dialogues.map((dlg, idx) => {
                            const isMe = dlg.sender === (selectedMeeting.currentUser || currentUserName);
                            return (
                                <Box
                                    key={idx}
                                    sx={{
                                        mb: 1.5,
                                        p: 1.5,
                                        borderRadius: 2,
                                        bgcolor: isMe ? 'rgba(255, 152, 57, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                        borderLeft: isMe ? '4px solid #FF9839' : '4px solid #3b82f6'
                                    }}
                                >
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: isMe ? '#FF9839' : '#60a5fa' }}>
                                        {dlg.sender} {isMe ? "(You)" : "(Opponent)"}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#f8fafc', mt: 0.5 }}>
                                        {dlg.data}
                                    </Typography>
                                </Box>
                            );
                        })
                    ) : (
                        <Typography sx={{ color: '#94a3b8', py: 2 }}>No dialogue transcripts found.</Typography>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <Button onClick={() => setDialogOpen(false)} sx={{ color: '#94a3b8' }}>
                        Close
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={() => downloadMeetingPDF(selectedMeeting)}
                        sx={{ bgcolor: '#FF9839', '&:hover': { bgcolor: '#e07b18' } }}
                    >
                        Download PDF
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation Delete Dialog */}
            <Dialog
                open={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                PaperProps={{
                    sx: { bgcolor: '#161b22', color: '#fff', borderRadius: 3, border: '1px solid rgba(239, 68, 68, 0.3)', p: 1 }
                }}
            >
                <DialogTitle sx={{ fontWeight: 700, color: '#ef4444' }}>
                    Confirm Delete
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: '#cbd5e1' }}>
                        Are you sure you want to delete the meeting room <strong>"{meetingToDelete?.meetingCode || meetingToDelete}"</strong>?
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>
                        This will permanently erase all dialogue logs, timestamps, participant records, and PDF summaries for this call.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDeleteModalOpen(false)} sx={{ color: '#94a3b8' }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleDeleteMeeting}
                        sx={{ bgcolor: '#ef4444', color: '#fff', '&:hover': { bgcolor: '#dc2626' } }}
                    >
                        Yes, Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={toastOpen}
                autoHideDuration={3000}
                onClose={() => setToastOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setToastOpen(false)} severity="success" sx={{ width: '100%', bgcolor: '#16a34a', color: '#fff' }}>
                    Meeting session and transcripts deleted successfully!
                </Alert>
            </Snackbar>
        </Box>
    );
}