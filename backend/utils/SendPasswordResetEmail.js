require("dotenv").config();
const nodemailer = require("nodemailer");

// Use environment variables or fallback to existing values
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
        user: process.env.EMAIL_USER || "adnan400283@gmail.com",
        pass: process.env.EMAIL_PASS || "idchvrimzownatsa",
    },
});

async function sendPasswordResetEmail(toEmail, resetToken) {
    // Use environment variable for frontend URL or fallback
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    try {
        const info = await transporter.sendMail({
            from: `"Up To-Do App" <${process.env.EMAIL_USER || "adnan400283@gmail.com"}>`,
            to: toEmail,
            subject: "Password Reset Request - Up To-Do App",
            html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: auto;">
            <h2>Password Reset</h2>
            <p>You requested to reset your password. Click the button below to reset it. This link expires in 1 hour.</p>
            <div style="margin: 24px 0;">
              <a href="${resetLink}" 
                 style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #4F46E5; font-size: 12px; word-break: break-all;">${resetLink}</p>
            <p style="color: #888; font-size: 12px; margin-top: 24px;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
          </div>
        `,
        });
        
        console.log("✅ Password reset email sent successfully:", info.messageId);
        console.log("   To:", toEmail);
        console.log("   Reset link:", resetLink);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("❌ Failed to send password reset email:");
        console.error("   Error:", error.message);
        console.error("   To:", toEmail);
        console.error("   Email User:", process.env.EMAIL_USER || "adnan400283@gmail.com");
        return { success: false, error: error.message };
    }
}

module.exports = sendPasswordResetEmail;
