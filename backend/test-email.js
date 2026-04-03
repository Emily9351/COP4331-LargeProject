// Simple Email Test Script
// Run this with: node test-email.js your-email@example.com

require("dotenv").config();
const sgMail = require("@sendgrid/mail");

const testEmail = process.argv[2];

if (!testEmail) {
  console.error("Usage: node test-email.js your-email@example.com");
  process.exit(1);
}

console.log("\n🧪 Testing Email Configuration (SendGrid)\n");
console.log("Environment Variables:");
console.log("  SENDGRID_API_KEY:", process.env.SENDGRID_API_KEY ? "****" + process.env.SENDGRID_API_KEY.slice(-4) : "(not set)");
console.log("  SENDGRID_FROM_EMAIL:", process.env.SENDGRID_FROM_EMAIL || "(not set)");
console.log("  FRONTEND_URL:", process.env.FRONTEND_URL || "(not set, using http://localhost:5173)");
console.log("");

// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function testEmailSending() {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetLink = `${frontendUrl}/reset-password?token=TEST-TOKEN-123`;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@yourdomain.com";

  console.log("📧 Attempting to send test email...");
  console.log("  From:", fromEmail);
  console.log("  To:", testEmail);
  console.log("  Reset Link:", resetLink);
  console.log("");

  const msg = {
    to: testEmail,
    from: fromEmail,
    subject: "🧪 Test Email - Password Reset",
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 3px solid #4F46E5;">
        <h2 style="color: #4F46E5;">🧪 Test Email</h2>
        <p>This is a test email to verify your SendGrid email configuration is working.</p>
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
          Service: SendGrid API<br>
          From: ${fromEmail}<br>
          Frontend URL: ${frontendUrl}
        </p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);

    console.log("✅ SUCCESS! Email sent successfully!");
    console.log("");
    console.log("📬 Check your email inbox (and spam folder)");
    console.log("");
  } catch (error) {
    console.error("❌ FAILED to send email!");
    console.error("  Error Code:", error.code);
    console.error("  Error Message:", error.message);
    console.error("");
    
    if (error.code === 401 || error.code === 403) {
      console.error("🔐 Authentication failed. This usually means:");
      console.error("  1. Invalid or missing SENDGRID_API_KEY in .env");
      console.error("  2. API key doesn't have permission to send emails");
      console.error("");
      console.error("To fix:");
      console.error("  1. Go to: https://app.sendgrid.com/settings/api_keys");
      console.error("  2. Create a new API key with 'Mail Send' permissions");
      console.error("  3. Update SENDGRID_API_KEY in your .env file");
    } else if (error.response && error.response.body && error.response.body.errors) {
      console.error("📧 SendGrid API errors:");
      error.response.body.errors.forEach(err => {
        console.error(`  - ${err.message}`);
        if (err.field) console.error(`    Field: ${err.field}`);
      });
      console.error("");
      console.error("Common issues:");
      console.error("  1. From email not verified in SendGrid");
      console.error("     Go to: https://app.sendgrid.com/settings/sender_auth");
      console.error("  2. Invalid email format");
    } else {
      console.error("Full error:", error);
    }
    console.error("");
    process.exit(1);
  }
}

testEmailSending();
