import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock } from "lucide-react";
import UpIcon from "../assets/UpIcon.png";
import "../css/Login.css";

export function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [token, setToken] = useState("");

    useEffect(() => {
        const tokenParam = searchParams.get("token");
        if (!tokenParam) {
            setError("Invalid reset link. Please request a new password reset.");
        } else {
            setToken(tokenParam);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (!newPassword || !confirmPassword) {
            setError("Please fill in all fields");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Failed to reset password");
                return;
            }

            setMessage(data.message);
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate("/");
            }, 2000);
        } catch (err) {
            console.error("Reset password error:", err);
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
                    <h1>Set New Password</h1>
                    <p>Enter your new password below</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <label htmlFor="newPassword">New Password</label>
                        <div className="input-wrapper">
                            <Lock className="input-icon" />
                            <input
                                id="newPassword"
                                type="password"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <div className="input-wrapper">
                            <Lock className="input-icon" />
                            <input
                                id="confirmPassword"
                                type="password"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {error && <p className="error-text">{error}</p>}
                    {message && <p className="success-text">{message}</p>}

                    <button type="submit" className="login-button" disabled={isLoading || !token}>
                        {isLoading ? "Resetting..." : "Reset Password"}
                    </button>
                </form>

                <p className="footer-text">
                    Remember your password? <a href="/">Sign in</a>
                </p>
            </div>
        </div>
    );
}
