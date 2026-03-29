
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import UpBackground from "../assets/UpBackground.png";
import UpIcon from "../assets/UpIcon.png"
import "../css/Login.css"

export function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (email && password) {
        navigate("/dashboard");
        }
    };

    return (
    <div className="login-page">
        <div className="overlay" />

        <div className="login-card">
            <div className="login-header">
            <div className="icon-box">
                <img 
                    src={UpIcon} 
                    alt="Up Icon" 
                    className="icon" 
                />
            </div>
            <h1>Adventure Awaits</h1>
            <p>Reach New Heights One Task at a Time</p>
            </div>

            <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                <Mail className="input-icon" />
                <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                </div>
            </div>

            <div className="input-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                </div>
            </div>

            <button type="submit" className="login-button">
                Sign In
            </button>
            </form>

            <p className="footer-text">
                Don't have an account? <a href="/registration">Create one</a>

            </p>
        </div>
        </div>
    );
}


