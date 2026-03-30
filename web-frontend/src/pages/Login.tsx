
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import UpBackground from "../assets/UpBackground.png";
import UpIcon from "../assets/UpIcon.png"
import "../css/Registration.css"

export function Registration() {
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleregistration = async (e: React.FormEvent) => {
        e.preventDefault();

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

            alert("Registration successful!");
            navigate("/"); // go to login
        } catch (error: any) {
            console.error("Registration error:", error);
            alert(error.message);
        }
    };

    return (
        <div className="registration-page"
            style={{ backgroundImage: `url(${UpBackground})` }}
        >
            <div className="overlay" />

            <div className="registration-card">
                <div className="registration-header">
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

                <form onSubmit={handleregistration} className="registration-form">
                    <div className="input-group">
                        <label htmlFor="firstName">First Name</label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" />
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
                        <label htmlFor="lastName">Last Name</label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" />
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

                    <button type="submit" className="registration-button">
                        Sign In
                    </button>
                </form>

                <p className="footer-text">
                    Already have an account?{" "}
                    <Link to="/">Login</Link>
                </p>
            </div>
        </div>
    );
}