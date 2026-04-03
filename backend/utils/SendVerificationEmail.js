require("dotenv").config();
const sgMail = require("@sendgrid/mail");

// Configure SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendVerificationEmail(toEmail, code) {
    const msg = {
        to: toEmail,
        from: process.env.SENDGRID_FROM_EMAIL || "noreply@yourdomain.com",
        subject: "Your Verification Code",
        html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: auto;">
        <h2>Email Verification</h2>
        <p>Use the code below to verify your account. It expires in 15 minutes.</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0;">
          ${code}
        </div>
        <p style="color: #888; font-size: 12px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
    };

    try {
        await sgMail.send(msg);
        console.log("✅ Verification email sent successfully to:", toEmail);
    } catch (error) {
        console.error("❌ Failed to send verification email:");
        console.error("   Error:", error.message);
        console.error("   To:", toEmail);
        throw error;
    }
}

module.exports = sendVerificationEmail;