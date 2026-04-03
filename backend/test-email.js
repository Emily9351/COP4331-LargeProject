// Simple Email Test Script
// Run this with: node test-email.js your-email@example.com

require("dotenv").config();
const nodemailer = require("nodemailer");

const testEmail = process.argv[2];

if (!testEmail) {
  console.error("Usage: node test-email.js your-email@example.com");
  process.exit(1);
}

console.log("\n🧪 Testing Email Configuration\n");
console.log("Environment Variables:");
console.log("  EMAIL_SERVICE:", process.env.EMAIL_SERVICE || "(not set, using gmail)");
console.log("  EMAIL_USER:", process.env.EMAIL_USER || "(not set, using fallback)");
console.log("  EMAIL_PASS:", process.env.EMAIL_PASS ? "****" + process.env.EMAIL_PASS.slice(-4) : "(not set, using fallback)");
console.log("  FRONTEND_URL:", process.env.FRONTEND_URL || "(not set, using http://localhost:5173)");
console.log("");

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER || "adnan400283@gmail.com",
    pass: process.env.EMAIL_PASS || "idchvrimzownatsa",
  },
});

async function testEmailSending() {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetLink = `${frontendUrl}/reset-password?token=TEST-TOKEN-123`;

  console.log("📧 Attempting to send test email...");
  console.log("  From:", process.env.EMAIL_USER || "adnan400283@gmail.com");
  console.log("  To:", testEmail);
  console.log("  Reset Link:", resetLink);
  console.log("");

  try {
    const info = await transporter.sendMail({
      from: `"Up To-Do App Test" <${process.env.EMAIL_USER || "adnan400283@gmail.com"}>`,
      to: testEmail,
      subject: "🧪 Test Email - Password Reset",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 3px solid #4F46E5;">
          <h2 style="color: #4F46E5;">🧪 Test Email</h2>
          <p>This is a test email to verify your email configuration is working.</p>
          <div style="margin: 24px 0;">
            <a href="${resetLink}" 
               style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Test Reset Link
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Reset link:</p>
          <p style="color: #4F46E5; font-size: 12px; word-break: break-all;">${resetLink}</p>
          <hr>
          <p style="color: #888; font-size: 12px;">
            <strong>Configuration:</strong><br>
            Service: ${process.env.EMAIL_SERVICE || "gmail"}<br>
            From: ${process.env.EMAIL_USER || "adnan400283@gmail.com"}<br>
            Frontend URL: ${frontendUrl}
          </p>
        </div>
      `,
    });

    console.log("✅ SUCCESS! Email sent successfully!");
    console.log("  Message ID:", info.messageId);
    console.log("  Accepted:", info.accepted);
    console.log("  Response:", info.response);
    console.log("");
    console.log("📬 Check your email inbox (and spam folder)");
    console.log("");
  } catch (error) {
    console.error("❌ FAILED to send email!");
    console.error("  Error Code:", error.code);
    console.error("  Error Message:", error.message);
    console.error("");
    
    if (error.code === "EAUTH") {
      console.error("🔐 Authentication failed. This usually means:");
      console.error("  1. Wrong email or password in .env");
      console.error("  2. Not using Gmail App Password (if using Gmail)");
      console.error("  3. 2-Step Verification not enabled (required for Gmail)");
      console.error("");
      console.error("To fix:");
      console.error("  1. Go to: https://myaccount.google.com/apppasswords");
      console.error("  2. Generate a new App Password");
      console.error("  3. Update EMAIL_PASS in your .env file");
      console.error("  4. Make sure EMAIL_USER matches your Gmail address");
    } else if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
      console.error("🌐 Connection failed. This usually means:");
      console.error("  1. No internet connection");
      console.error("  2. Firewall blocking SMTP ports (587/465)");
      console.error("  3. Server network restrictions");
    } else {
      console.error("Full error:", error);
    }
    console.error("");
    process.exit(1);
  }
}

testEmailSending();
