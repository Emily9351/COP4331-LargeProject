import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import UpIcon from "../assets/UpIcon.png";
import "../css/Login.css";
import { setAuthSession } from "../lib/auth";

export function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) return;

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.message || "Login failed");
                return;
            }

            const data = await response.json();

            setAuthSession(data.token, {
                userId: data.userId,
                role: data.role,
                name: data.name,
                email: data.user?.email,
            });

            console.log("Login successful", data);
            console.log("LOGIN DATA:", data);

            if (data.role === "professor") {
                navigate("/professor-dashboard");
            } else {
                navigate("/dashboard"); 
            }

        } catch (err) {
            console.error("Login error:", err);
            setError("Server unreachable or network error");
        }
    };

    return (
        <div className="login-page">
            <div className="overlay" />

            <div className="login-card">
                <div className="login-header">
                    <div className="icon-box">
                        <img src={UpIcon} alt="Up Icon" className="icon" />
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

                    {error && <p className="error-text">{error}</p>}

                    <button type="submit" className="login-button">
                        Sign In
                    </button>

                    <p className="forgot-password-link">
                        <a href="/forgot-password">Forgot password?</a>
                    </p>
                </form>

                <p className="footer-text">
                    Don't have an account? <a href="/registration">Create one</a>
                </p>
            </div>
        </div>
    );
}
