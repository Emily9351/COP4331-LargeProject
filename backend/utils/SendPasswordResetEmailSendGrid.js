require("dotenv").config();
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

async function sendPasswordResetEmail(toEmail, resetToken) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    const msg = {
        to: toEmail,
        from: {
            email: process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER || 'noreply@emilydensmore.com',
            name: 'Up To-Do App'
        },
        subject: 'Password Reset Request - Up To-Do App',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: auto;">
            <h2 style="color: #4F46E5;">Password Reset</h2>
            <p>You requested to reset your password. Click the button below to reset it. This link expires in 1 hour.</p>
            <div style="margin: 24px 0; text-align: center;">
              <a href="${resetLink}" 
                 style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #4F46E5; font-size: 12px; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">${resetLink}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #888; font-size: 12px;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
            <p style="color: #888; font-size: 12px;">This link will expire in 1 hour for security reasons.</p>
          </div>
        `,
        text: `
Password Reset Request - Up To-Do App

You requested to reset your password. 

To reset your password, visit this link:
${resetLink}

This link will expire in 1 hour for security reasons.

If you didn't request this, please ignore this email. Your password will remain unchanged.
        `
    };

    try {
        await sgMail.send(msg);
        console.log("✅ Password reset email sent via SendGrid");
        console.log("   To:", toEmail);
        console.log("   From:", msg.from.email);
        console.log("   Reset link:", resetLink);
        return { success: true };
    } catch (error) {
        console.error("❌ Failed to send email via SendGrid:");
        console.error("   Error:", error.message);
        
        if (error.response) {
            console.error("   Status Code:", error.response.statusCode);
            console.error("   Response Body:", JSON.stringify(error.response.body, null, 2));
        }
        
        // Common error messages
        if (error.message.includes('API key')) {
            console.error("\n🔑 SENDGRID_API_KEY is missing or invalid in .env");
            console.error("   Get your API key from: https://app.sendgrid.com/settings/api_keys");
        } else if (error.message.includes('from')) {
            console.error("\n📧 'From' email address needs to be verified in SendGrid");
            console.error("   Go to: https://app.sendgrid.com/settings/sender_auth");
        }
        
        return { success: false, error: error.message };
    }
}

module.exports = sendPasswordResetEmail;
