const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "adnan400283@gmail.com",
        pass: "idchvrimzownatsa",  // app password with spaces removed
    },
});

async function sendVerificationEmail(toEmail, code) {
    await transporter.sendMail({
        from: '"Study App" <adnan400283@gmail.com>',
        to: toEmail,
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
    });
}

module.exports = sendVerificationEmail;