import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import GoogleIcon from '@mui/icons-material/Google';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const defaultTheme = createTheme();

export default function Authentication() {
    const navigate = useNavigate();
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [name, setName] = React.useState("");
    const [error, setError] = React.useState("");
    const [message, setMessage] = React.useState("");

    // 0 -> Sign In, 1 -> Sign Up
    const [formState, setFormState] = React.useState(0);
    const [open, setOpen] = React.useState(false);

    const { handleRegister, handleLogin, handleSocialLogin } = React.useContext(AuthContext);

    const handleSwitchForm = (state) => {
        setFormState(state);
        setError("");
        setUsername("");
        setPassword("");
        setName("");
    };

    const handleAuth = async (e) => {
        if (e) e.preventDefault();
        setError("");
        try {
            if (formState === 0) {
                await handleLogin(username, password);
                localStorage.setItem("user", JSON.stringify({
                    name: username,
                    email: `${username}@patshala.local`,
                    photoURL: ""
                }));
                navigate("/home");
            }
            if (formState === 1) {
                let result = await handleRegister(name, username, password);
                setUsername("");
                setPassword("");
                setName("");
                setMessage(result || "Registration Successful! Please Sign In.");
                setOpen(true);
                setError("");
                setFormState(0);
            }
        } catch (err) {
            console.error(err);
            let errMessage = err?.response?.data?.message || "An error occurred. Please try again.";
            setError(errMessage);
        }
    };

    // গুগল দিয়ে লগইন
    const handleGoogleLogin = async () => {
        setError("");
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            const token = await user.getIdToken();
            localStorage.setItem("token", token);
            
            localStorage.setItem("user", JSON.stringify({
                name: user.displayName || "Google User",
                email: user.email || "",
                uid: user.uid,
                photoURL: user.photoURL || ""
            }));

            if (user.photoURL && !localStorage.getItem("user_avatar")) {
                localStorage.setItem("user_avatar", user.photoURL);
            }

            if (handleSocialLogin) {
                await handleSocialLogin(user.displayName, user.email, user.uid);
            } else {
                navigate("/home");
            }
        } catch (err) {
            console.error("Google Sign-In Error:", err);
            setError(err.message || "Google sign in failed.");
        }
    };

    return (
        <ThemeProvider theme={defaultTheme}>
            <Grid container component="main" sx={{ height: '100vh' }}>
                <CssBaseline />
                <Grid
                    item
                    xs={false}
                    sm={4}
                    md={7}
                    sx={{
                        backgroundImage: 'url(login.jpg)',
                        backgroundRepeat: 'no-repeat',
                        backgroundColor: (t) =>
                            t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
                    <Box
                        sx={{
                            my: 6,
                            mx: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                            <LockOutlinedIcon />
                        </Avatar>

                        <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
                            {formState === 0 ? "Sign In" : "Sign Up"}
                        </Typography>

                        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                            <Button 
                                variant={formState === 0 ? "contained" : "outlined"} 
                                onClick={() => handleSwitchForm(0)}
                            >
                                Sign In
                            </Button>
                            <Button 
                                variant={formState === 1 ? "contained" : "outlined"} 
                                onClick={() => handleSwitchForm(1)}
                            >
                                Sign Up
                            </Button>
                        </Box>

                        <Box component="form" onSubmit={handleAuth} noValidate sx={{ mt: 1, width: '100%' }}>
                            {formState === 1 && (
                                <TextField
                                    margin="normal"
                                    required
                                    fullWidth
                                    id="fullname"
                                    label="Full Name"
                                    name="name"
                                    value={name}
                                    autoFocus
                                    onChange={(e) => setName(e.target.value)}
                                />
                            )}

                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="username"
                                label="Username"
                                name="username"
                                value={username}
                                autoFocus={formState === 0}
                                onChange={(e) => setUsername(e.target.value)}
                            />

                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            {error && (
                                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                                    {error}
                                </Typography>
                            )}

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                            >
                                {formState === 0 ? "Login" : "Register"}
                            </Button>

                            <Divider sx={{ my: 2 }}>OR</Divider>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<GoogleIcon />}
                                    onClick={handleGoogleLogin}
                                    sx={{
                                        color: '#DB4437',
                                        borderColor: '#DB4437',
                                        '&:hover': {
                                            borderColor: '#c33d2f',
                                            backgroundColor: 'rgba(219, 68, 55, 0.04)'
                                        }
                                    }}
                                >
                                    Continue with Google
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </Grid>
            </Grid>

            <Snackbar
                open={open}
                autoHideDuration={4000}
                onClose={() => setOpen(false)}
                message={message}
            />
        </ThemeProvider>
    );
}