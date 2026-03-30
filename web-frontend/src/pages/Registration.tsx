import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, User, KeyRound } from "lucide-react";
import UpBackground from "../assets/UpBackground.png";
import UpIcon from "../assets/UpIcon.png";
import "../css/Registration.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Registration() {
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [emailError, setEmailError] = useState("");
    const [error, setError] = useState("");

    // Verification step state
    const [step, setStep] = useState<"register" | "verify">("register");
    const [userId, setUserId] = useState("");
    const [code, setCode] = useState("");
    const [verifyError, setVerifyError] = useState("");

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setEmail(value);
        if (value && !EMAIL_REGEX.test(value)) {
            setEmailError("Please enter a valid email address");
        } else {
            setEmailError("");
        }
    };

    const handleRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!EMAIL_REGEX.test(email)) {
            setEmailError("Please enter a valid email address");
            return;
        }

        try {
            const name = `${firstName} ${lastName}`;
            const response = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || "Registration failed");
            }

            const data = await response.json();
            setUserId(data.userId);
            setStep("verify"); // show verification screen
        } catch (error: unknown) {
            setError(error instanceof Error ? error.message : "Registration failed");
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifyError("");

        try {
            const response = await fetch("/api/verify-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, code }),
            });

            if (!response.ok) {
                const data = await response.json();
                setVerifyError(data.message || "Verification failed");
                return;
            }

            navigate("/"); // go to login
        } catch {
            setVerifyError("Server error. Please try again.");
        }
    };

    if (step === "verify") {
        return (
            <div className="registration-page" style={{ backgroundImage: `url(${UpBackground})` }}>
                <div className="overlay" />
                <div className="registration-card">
                    <div className="registration-header">
                        <div className="icon-box">
                            <img src={UpIcon} alt="Up Icon" className="icon" />
                        </div>
                        <h1>Check Your Email</h1>
                        <p>We sent a 6-digit code to {email}</p>
                    </div>

                    <form onSubmit={handleVerify} className="registration-form">
                        <div className="input-group">
                            <label htmlFor="code">Verification Code</label>
                            <div className="input-wrapper">
                                <KeyRound className="input-icon" />
                                <input
                                    id="code"
                                    type="text"
                                    placeholder="Enter 6-digit code"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    maxLength={6}
                                    required
                                />
                            </div>
                        </div>

                        {verifyError && <p className="error-text">{verifyError}</p>}

                        <button type="submit" className="registration-button">
                            Verify Email
                        </button>
                    </form>

                    <p className="footer-text">
                        Wrong email? <Link to="/registration">Start over</Link>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="registration-page" style={{ backgroundImage: `url(${UpBackground})` }}>
            <div className="overlay" />
            <div className="registration-card">
                <div className="registration-header">
                    <div className="icon-box">
                        <img src={UpIcon} alt="Up Icon" className="icon" />
                    </div>
                    <h1>Adventure Awaits</h1>
                    <p>Reach New Heights One Task at a Time</p>
                </div>

                <form onSubmit={handleRegistration} className="registration-form">
                    <div className="input-group">
                        <label htmlFor="firstname">First Name</label>
                        <div className="input-wrapper">
                            <User className="input-icon" />
                            <input
                                id="firstname"
                                type="text"
                                placeholder="Enter your first name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="lastname">Last Name</label>
                        <div className="input-wrapper">
                            <User className="input-icon" />
                            <input
                                id="lastname"
                                type="text"
                                placeholder="Enter your last name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" />
                            <input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={handleEmailChange}
                                required
                            />
                        </div>
                        {emailError && <p className="error-text">{emailError}</p>}
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

                    <button type="submit" className="registration-button">
                        Create Account
                    </button>
                </form>

                <p className="footer-text">
                    Already have an account? <Link to="/">Login</Link>
                </p>
            </div>
        </div>
    );
}
