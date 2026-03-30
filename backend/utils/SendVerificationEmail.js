const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendVerificationEmail(toEmail, code) {
    await transporter.sendMail({
        from: `"Adventure Awaits" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Verify your email",
        html: `
      <h2>Welcome to Adventure Awaits!</h2>
      <p>Your verification code is:</p>
      <h1 style="letter-spacing: 8px;">${code}</h1>
      <p>This code expires in 15 minutes.</p>
    `,
    });
}

module.exports = sendVerificationEmail;