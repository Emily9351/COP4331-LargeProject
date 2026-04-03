import { useState } from "react";
import { Mail } from "lucide-react";
import UpIcon from "../assets/UpIcon.png";
import "../css/Login.css";

export function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (!email) return;

        setIsLoading(true);

        try {
            const response = await fetch("/api/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Failed to send reset email");
                return;
            }

            setMessage(data.message);
        } catch (err) {
            console.error("Forgot password error:", err);
            setError("Server unreachable or network error");
        } finally {
            setIsLoading(false);
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
                    <h1>Reset Password</h1>
                    <p>Enter your email to receive a password reset link</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
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

                    {error && <p className="error-text">{error}</p>}
                    {message && <p className="success-text">{message}</p>}

                    <button type="submit" className="login-button" disabled={isLoading}>
                        {isLoading ? "Sending..." : "Send Reset Link"}
                    </button>
                </form>

                <p className="footer-text">
                    Remember your password? <a href="/">Sign in</a>
                </p>
            </div>
        </div>
    );
}
