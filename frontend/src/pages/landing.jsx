import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import "../App.css";

export default function LandingPage() {
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // ব্যবহারকারী লগইন অবস্থায় আছে কি না তা শুধু যাচাই করা হচ্ছে (অটো-রিডাইরেক্ট বাদ দেওয়া হয়েছে)
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            setIsLoggedIn(true);
        } else {
            setIsLoggedIn(false);
        }
    }, []);

    return (
        <div className="landingPageContainer">
            {/* 🌐 ন্যাভিগেশন বার */}
            <nav>
                <div className="navHeader">
                    <h2 className="brandLogoHeading">
                        <img 
                            src="/icon1.png" 
                            alt="Patshala Logo" 
                            className="brandLogoImg" 
                        />
                        Patshala
                    </h2>
                </div>

                <div className="navlist">
                    
                    {/* যারা লগইন করেননি তাদের Login/Register দেখাবে, আর যারা লগইন আছেন তাদের Go to Dashboard দেখাবে */}
                    {!isLoggedIn ? (
                        <>
                            <p className="navItem" onClick={() => navigate("/auth")}>
                                Register
                            </p>
                            <div className="navAuthBtn" onClick={() => navigate("/auth")} role="button">
                                <p>Login</p>
                            </div>
                        </>
                    ) : (
                        <div className="navAuthBtn" onClick={() => navigate("/home")} role="button">
                            <p>Go to Dashboard</p>
                        </div>
                    )}
                </div>
            </nav>

            {/* 🚀 মেইন হিরো সেকশন */}
            <div className="landingMainContainer">
                <div className="heroContent">
                    <h1 className="heroTitle">
                        <span className="gradientText">Connect</span> with your loved Ones
                    </h1>
                    <p className="heroDescription">
                        Cover a distance by Patshala Video Call. Seamless, high-quality video communication for students and educators.
                    </p>

                    <div className="ctaButtonWrapper">
                        <Link className="ctaLink" to={isLoggedIn ? "/home" : "/auth"}>
                            {isLoggedIn ? "Go to Dashboard" : "Get Started"}
                        </Link>
                    </div>
                </div>

                <div className="heroImageWrapper">
                    <img className="heroImage" src="/mobile.png" alt="Patshala Video Interface" />
                </div>
            </div>

            {/* 🦶 ফুটার */}
            <footer className="landingFooter">
                <p>© {new Date().getFullYear()} <strong>Patshala</strong>. All rights reserved.</p>
            </footer>
        </div>
    );
}