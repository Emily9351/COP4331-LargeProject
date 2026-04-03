const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "adnan400283@gmail.com",
        pass: "idchvrimzownatsa",  // app password with spaces removed
    },
});

async function sendPasswordResetEmail(toEmail, resetToken) {
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
    
    await transporter.sendMail({
        from: '"Study App" <adnan400283@gmail.com>',
        to: toEmail,
        subject: "Password Reset Request",
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
}

module.exports = sendPasswordResetEmail;
