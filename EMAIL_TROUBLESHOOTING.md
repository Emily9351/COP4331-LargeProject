# Password Reset Email Troubleshooting Guide

## Problem Fixed

The password reset email wasn't sending because:
1. ✅ The reset link was hardcoded to `localhost:5173` - now uses `FRONTEND_URL` from .env
2. ✅ No error handling - now logs detailed errors to console
3. ✅ Server didn't check email send status - now properly handles success/failure

## How to Debug Email Issues

### Step 1: Check Backend Console Logs

When you submit a forgot password request, check your backend console (terminal where you ran `npm start`). You should see one of these:

**Success:**
```
✅ Password reset email sent successfully: <some-message-id>
   To: user@example.com
   Reset link: https://yourdomain.com/reset-password?token=abc123...
```

**Failure:**
```
❌ Failed to send password reset email:
   Error: Invalid login: 535-5.7.8 Username and Password not accepted
   To: user@example.com
   Email User: your-email@gmail.com
```

### Step 2: Configure Your .env File

Make sure your `backend/.env` file has these variables:

```env
# Your server/domain URL (where frontend is hosted)
FRONTEND_URL=https://yourdomain.com

# Email configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
```

**Important:** Replace:
- `https://yourdomain.com` with your actual server URL
- `your-email@gmail.com` with your Gmail address
- `your-16-char-app-password` with your Gmail App Password

### Step 3: Gmail App Password Setup

If you're using Gmail, you MUST use an "App Password" not your regular password:

1. **Enable 2-Step Verification:**
   - Go to https://myaccount.google.com/security
   - Click "2-Step Verification" and enable it

2. **Generate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other" as the device and name it "Password Reset"
   - Click "Generate"
   - Copy the 16-character password (remove spaces)
   - Put this in `EMAIL_PASS` in your .env file

3. **Restart Your Server:**
   ```bash
   # Stop the server (Ctrl+C)
   # Start it again
   npm start
   ```

### Step 4: Common Errors and Solutions

#### Error: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Solutions:**
- ✅ Make sure you're using an App Password, not your regular Gmail password
- ✅ Enable 2-Step Verification on your Google account first
- ✅ Copy the App Password without spaces
- ✅ Restart your backend server after updating .env

#### Error: "Missing credentials"

**Solutions:**
- ✅ Check that `EMAIL_USER` and `EMAIL_PASS` are set in .env
- ✅ Make sure .env file is in the `backend/` directory
- ✅ Verify there are no typos in variable names

#### Error: "getaddrinfo ENOTFOUND smtp.gmail.com"

**Solutions:**
- ✅ Check your internet connection
- ✅ Check if firewall is blocking port 587 or 465
- ✅ Try a different network

#### Email sends but user never receives it

**Solutions:**
- ✅ Check spam/junk folder
- ✅ Verify the email address is correct
- ✅ Check Gmail "Sent" folder to confirm it was sent
- ✅ Some email providers block automated emails - try a different email address

### Step 5: Test Email Sending

Add this test endpoint to your `server.js` (temporary, for debugging):

```javascript
// TEST EMAIL ENDPOINT - Remove this in production
app.post("/api/test-email", async (req, res) => {
  try {
    const { email } = req.body;
    console.log("🧪 Testing email to:", email);
    
    const result = await sendPasswordResetEmail(email, "test-token-123");
    
    res.json({
      success: result.success,
      message: result.success ? "Test email sent!" : "Failed to send email",
      details: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

Then test it:
```bash
curl -X POST http://your-server/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@gmail.com"}'
```

### Step 6: Alternative Email Services

If Gmail isn't working, try another service:

#### Outlook/Hotmail:
```env
EMAIL_SERVICE=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-outlook-password
```

#### Yahoo:
```env
EMAIL_SERVICE=yahoo
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-yahoo-app-password
```

#### SendGrid (recommended for production):
```env
# In .env
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_USER=noreply@yourdomain.com
```

Then update `backend/utils/SendPasswordResetEmail.js`:
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendPasswordResetEmail(toEmail, resetToken) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
  
  const msg = {
    to: toEmail,
    from: process.env.EMAIL_USER,
    subject: 'Password Reset Request',
    html: `<!-- your HTML template -->`
  };
  
  try {
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error);
    return { success: false, error: error.message };
  }
}
```

### Step 7: Verify Environment Variables

SSH into your server and check:

```bash
cd backend
cat .env | grep -E "FRONTEND_URL|EMAIL"
```

Should show:
```
FRONTEND_URL=https://yourdomain.com
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=****************
```

### Step 8: Check Logs for Detailed Errors

The updated code now logs detailed information:

```bash
# View recent logs
tail -f /path/to/your/logs

# Or if using PM2
pm2 logs backend

# Or if using systemd
journalctl -u your-service-name -f
```

## Quick Checklist

Before testing, verify:

- [ ] `.env` file exists in `backend/` directory
- [ ] `FRONTEND_URL` is set to your actual domain
- [ ] `EMAIL_SERVICE=gmail`
- [ ] `EMAIL_USER` is your Gmail address
- [ ] `EMAIL_PASS` is your Gmail App Password (16 chars)
- [ ] 2-Step Verification is enabled on Gmail
- [ ] Backend server was restarted after .env changes
- [ ] No typos in .env variable names
- [ ] No spaces in App Password

## Current File Structure

Your server should have:
```
backend/
├── .env (with EMAIL_ and FRONTEND_URL variables)
├── server.js (updated with error handling)
├── utils/
│   └── SendPasswordResetEmail.js (updated with logging)
└── node_modules/
    └── nodemailer/ (installed)
```

## What Happens Now

When a user requests password reset:

1. User enters email on `/forgot-password` page
2. Frontend sends POST to `/api/forgot-password`
3. Backend generates reset token
4. Backend saves token to database
5. Backend calls `sendPasswordResetEmail()`
6. **Email service logs to console** (check for ✅ or ❌)
7. If success: Email sent with reset link
8. If failure: Error logged but user still sees success message (security)
9. User receives email and clicks link
10. Link opens `https://yourdomain.com/reset-password?token=...`
11. User enters new password
12. Backend validates token and updates password

## Need More Help?

Check these logs in order:
1. Backend console output (look for ✅ or ❌ messages)
2. Browser console (F12) for frontend errors
3. Network tab (F12) to see API responses
4. Gmail account "Sent" folder to verify emails were sent
5. Spam/junk folder of recipient

## Production Deployment

When deploying to production:

1. Update `.env`:
   ```env
   FRONTEND_URL=https://yourdomain.com
   ```

2. Use a dedicated email service:
   - SendGrid (99% deliverability, free tier available)
   - AWS SES (cheap, reliable)
   - Mailgun (good for developers)

3. Add rate limiting:
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const resetLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 3, // limit each IP to 3 requests per windowMs
     message: 'Too many reset attempts, please try again later'
   });
   
   app.post("/api/forgot-password", resetLimiter, async (req, res) => {
     // ... existing code
   });
   ```

4. Monitor email failures and set up alerts

## Files Modified

1. `backend/utils/SendPasswordResetEmail.js` - Added error handling and logging
2. `backend/server.js` - Added email result checking
3. `backend/.env` - Need to add EMAIL_ and FRONTEND_URL variables
