# SendGrid Setup Guide - Fix ESOCKET Error

## Problem Solved

Your server has **ESOCKET error** because it blocks SMTP ports (587/465). SendGrid uses HTTPS (port 443) instead, which bypasses this completely.

---

## Step 1: Sign Up for SendGrid (5 minutes)

1. Go to **https://sendgrid.com/**
2. Click **"Start for Free"**
3. Fill in your information:
   - Email: Your email
   - Password: Create a password
   - Click **"Create Account"**
4. Verify your email address
5. Complete the signup form (tell them you're sending "Transactional" emails)

**Free Tier:** 100 emails/day forever (plenty for password resets)

---

## Step 2: Create API Key

1. Log into SendGrid: https://app.sendgrid.com/
2. Go to **Settings → API Keys** (left sidebar)
   - Or direct link: https://app.sendgrid.com/settings/api_keys
3. Click **"Create API Key"** (blue button)
4. Name it: `Password Reset Emails`
5. Choose **"Full Access"** (or at minimum "Mail Send" permission)
6. Click **"Create & View"**
7. **COPY THE API KEY** - you'll only see it once!
   - It looks like: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## Step 3: Verify Sender Email

SendGrid requires you to verify the email address you're sending from.

### Option A: Single Sender Verification (Easiest)

1. Go to **Settings → Sender Authentication**
   - Or: https://app.sendgrid.com/settings/sender_auth
2. Click **"Verify a Single Sender"**
3. Click **"Create New Sender"**
4. Fill in the form:
   - **From Name:** Up To-Do App
   - **From Email Address:** noreply@emilydensmore.com
   - **Reply To:** your-email@example.com (where users can contact you)
   - **Company Address:** Your address
   - **City:** Your city
   - **State/Province:** Your state
   - **Zip Code:** Your zip
   - **Country:** Your country
5. Click **"Create"**
6. Check your email (`noreply@emilydensmore.com`) for verification link
7. Click the verification link

### Option B: Domain Authentication (Better for production)

1. Go to **Settings → Sender Authentication**
2. Click **"Authenticate Your Domain"**
3. Follow the wizard to add DNS records to your domain
4. This allows you to send from any email @emilydensmore.com

---

## Step 4: Update Your Server's .env File

SSH into your server and edit `backend/.env`:

```env
# MongoDB
MONGODB_URI=your-mongodb-uri-here

# Server
PORT=80

# Frontend URL
FRONTEND_URL=http://emilydensmore.com

# SendGrid Configuration
SENDGRID_API_KEY=SG.your-actual-api-key-from-step-2
SENDGRID_FROM_EMAIL=noreply@emilydensmore.com
```

**Important:**
- Replace `SG.your-actual-api-key-from-step-2` with your real API key
- Make sure `SENDGRID_FROM_EMAIL` matches the email you verified in Step 3

---

## Step 5: Deploy to Server

### Push changes to your server:

```bash
# On your local machine
git add .
git commit -m "Switch to SendGrid for email delivery"
git push
```

### On your server:

```bash
# SSH into server
ssh your-user@emilydensmore.com

# Navigate to backend
cd /path/to/backend

# Pull latest code
git pull

# Install new dependencies
npm install

# Edit .env file to add SendGrid keys
nano .env
# (Add the SENDGRID_API_KEY and SENDGRID_FROM_EMAIL lines)

# Restart your server
# If using PM2:
pm2 restart backend

# If using systemd:
sudo systemctl restart your-service-name

# Or if running directly:
npm start
```

---

## Step 6: Test It!

1. Go to your website: http://emilydensmore.com
2. Click **"Forgot password?"**
3. Enter your email
4. Click **"Send Reset Link"**
5. Check your backend console - you should see:
   ```
   ✅ Password reset email sent via SendGrid
      To: your-email@example.com
      From: noreply@emilydensmore.com
      Reset link: http://emilydensmore.com/reset-password?token=...
   ```
6. Check your email inbox (and spam folder)
7. Click the reset link
8. Set new password
9. Login with new password ✅

---

## Troubleshooting

### Error: "API key is missing or invalid"

**Fix:** Check your .env file:
```bash
cat backend/.env | grep SENDGRID
```

Should show:
```
SENDGRID_API_KEY=SG.xxxxxxxxx...
SENDGRID_FROM_EMAIL=noreply@emilydensmore.com
```

- Make sure there are no spaces around the `=`
- Make sure the API key starts with `SG.`
- Make sure you restarted the server after editing .env

### Error: "'From' email address needs to be verified"

**Fix:** 
1. Go to https://app.sendgrid.com/settings/sender_auth
2. Make sure the email is listed and has a green checkmark
3. If not, verify it by clicking the verification email
4. The `SENDGRID_FROM_EMAIL` in .env must exactly match the verified email

### Error: "The from email does not contain a valid address"

**Fix:** Make sure `SENDGRID_FROM_EMAIL` is a valid email format:
```env
# Correct:
SENDGRID_FROM_EMAIL=noreply@emilydensmore.com

# Wrong:
SENDGRID_FROM_EMAIL=emilydensmore.com
SENDGRID_FROM_EMAIL=noreply
```

### Email sends but never arrives

**Check these:**
1. **Spam folder** - SendGrid emails often go to spam initially
2. **SendGrid Activity Feed:**
   - Go to https://app.sendgrid.com/email_activity
   - Check if email was delivered, bounced, or blocked
3. **Verify correct email address** - Make sure you're using a real email

### Still getting ESOCKET error

**This means:**
- Code is still using the old SMTP service instead of SendGrid
- Check that `server.js` line 10 says:
  ```javascript
  const sendPasswordResetEmail = require("./utils/SendPasswordResetEmailSendGrid");
  ```
- Not:
  ```javascript
  const sendPasswordResetEmail = require("./utils/SendPasswordResetEmail");
  ```

---

## Why SendGrid Works When SMTP Doesn't

| Method | Port | Protocol | Works on Your Server? |
|--------|------|----------|----------------------|
| Gmail SMTP | 587 | SMTP | ❌ Blocked (ESOCKET) |
| Gmail SMTP SSL | 465 | SMTP | ❌ Blocked (ESOCKET) |
| SendGrid | 443 | HTTPS | ✅ Works! |

Your hosting provider blocks SMTP ports to prevent spam, but HTTPS (port 443) is always open because it's what web traffic uses.

---

## SendGrid Benefits

✅ **No port blocking** - Uses HTTPS (port 443)
✅ **Better deliverability** - 99%+ inbox rate vs Gmail's ~70%
✅ **Free tier** - 100 emails/day forever
✅ **Email analytics** - See opens, clicks, bounces
✅ **Activity feed** - Debug email delivery issues
✅ **Reliable** - Used by Uber, Spotify, Airbnb
✅ **Fast** - Faster than SMTP

---

## Quick Reference

**SendGrid Dashboard:** https://app.sendgrid.com/

**Important links:**
- API Keys: https://app.sendgrid.com/settings/api_keys
- Sender Auth: https://app.sendgrid.com/settings/sender_auth
- Email Activity: https://app.sendgrid.com/email_activity
- Stats: https://app.sendgrid.com/statistics

**What you need in .env:**
```env
SENDGRID_API_KEY=SG.xxxx...
SENDGRID_FROM_EMAIL=noreply@emilydensmore.com
FRONTEND_URL=http://emilydensmore.com
```

---

## Files Changed

✅ `backend/package.json` - Added `@sendgrid/mail`
✅ `backend/utils/SendPasswordResetEmailSendGrid.js` - New SendGrid service
✅ `backend/server.js` - Updated to use SendGrid
✅ `backend/.env.example` - Added SendGrid configuration

---

## Next Steps

After emails are working:
1. Monitor SendGrid activity feed for first week
2. If emails go to spam, complete Domain Authentication (Step 3, Option B)
3. Consider adding "Resend verification email" feature
4. Add rate limiting to prevent abuse

---

## Support

If you still have issues:
1. Check SendGrid Activity Feed for delivery status
2. Check backend console for detailed error messages
3. Verify API key and from email in .env
4. Make sure sender email is verified in SendGrid
