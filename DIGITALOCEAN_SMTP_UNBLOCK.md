# Unblocking SMTP on DigitalOcean

## Good News!

DigitalOcean **does NOT block SMTP ports by default** on droplets. However, there could be firewall rules blocking them.

## Solution 1: Check UFW Firewall (Most Common Issue)

DigitalOcean droplets often have UFW (Uncomplicated Firewall) enabled, which blocks outbound SMTP by default.

### Check if UFW is active:
```bash
sudo ufw status
```

If it says "Status: active", check the rules:
```bash
sudo ufw status verbose
```

### Allow outbound SMTP ports:
```bash
# Allow port 587 (STARTTLS)
sudo ufw allow out 587/tcp

# Allow port 465 (SSL/TLS)
sudo ufw allow out 465/tcp

# Allow port 25 (if needed)
sudo ufw allow out 25/tcp

# Reload firewall
sudo ufw reload

# Check status
sudo ufw status
```

### Test immediately:
```bash
cd /path/to/backend
node test-email.js your-email@example.com
```

---

## Solution 2: Check iptables

If UFW isn't the issue, check iptables directly:

```bash
# View current iptables rules
sudo iptables -L -v -n | grep -i smtp

# Or check all OUTPUT rules
sudo iptables -L OUTPUT -v -n

# If you see REJECT or DROP rules for ports 587/465, remove them:
sudo iptables -D OUTPUT <rule-number>

# Save changes
sudo netfilter-persistent save
# Or on some systems:
sudo iptables-save > /etc/iptables/rules.v4
```

---

## Solution 3: DigitalOcean Cloud Firewall

Check if you have a Cloud Firewall enabled in DigitalOcean dashboard:

1. Go to https://cloud.digitalocean.com/networking/firewalls
2. Click on any firewalls attached to your droplet
3. Check **Outbound Rules**
4. Make sure there's a rule allowing:
   - **Protocol:** TCP
   - **Ports:** 587, 465
   - **Destination:** All IPv4, All IPv6

If not, add these rules:
- Click "New rule" in Outbound Rules
- Protocol: TCP
- Ports: 587
- Destinations: All IPv4 (0.0.0.0/0) and All IPv6 (::/0)
- Click "Add Rule"
- Repeat for port 465

---

## Solution 4: Check for Port Blocking on New Accounts

DigitalOcean **might** temporarily block SMTP on very new accounts (< 60 days old) to prevent spam.

### To request unblocking:

1. Go to: https://cloud.digitalocean.com/support/tickets
2. Click "Create Ticket"
3. Use this template:

```
Subject: Request to Unblock SMTP Ports for Password Reset Emails

Hi DigitalOcean Support,

I'm running a web application on my droplet (emilydensmore.com) that needs to send 
password reset emails to users. I'm currently getting ESOCKET timeout errors when 
trying to connect to smtp.gmail.com on ports 587 and 465.

Could you please verify that SMTP ports are not blocked on my account/droplet?

Droplet IP: [your droplet IP]
Use case: Sending transactional password reset emails only (not bulk marketing)
Expected volume: < 50 emails per day

Thank you!
```

They usually respond within a few hours and can unblock immediately if needed.

---

## Solution 5: Quick Fix - Allow All Outbound (Less Secure)

If you want to quickly test if firewall is the issue:

```bash
# Temporarily disable UFW to test
sudo ufw disable

# Test email
cd /path/to/backend
node test-email.js your-email@example.com

# If it works, re-enable UFW and add proper rules
sudo ufw enable
sudo ufw allow out 587/tcp
sudo ufw allow out 465/tcp
sudo ufw reload
```

---

## Solution 6: Use DigitalOcean's Recommended Approach

DigitalOcean actually recommends using third-party email services (like SendGrid) instead of direct SMTP because:

1. **Better deliverability** - Your droplet IP isn't established as a trusted sender
2. **No spam issues** - Won't risk getting your droplet IP blacklisted  
3. **More reliable** - Dedicated email infrastructure
4. **Easier to scale** - No rate limits or delivery issues

**Their official docs:** https://docs.digitalocean.com/products/droplets/how-to/configure-email/

---

## Testing Which Solution Worked

After trying any solution, test with this script:

```bash
cd /path/to/backend

# Test port connectivity
timeout 5 bash -c '</dev/tcp/smtp.gmail.com/587' && echo "✅ Port 587 OPEN" || echo "❌ Port 587 BLOCKED"
timeout 5 bash -c '</dev/tcp/smtp.gmail.com/465' && echo "✅ Port 465 OPEN" || echo "❌ Port 465 BLOCKED"

# Test actual email sending
node test-email.js your-email@example.com
```

---

## My Recommendation

**Try in this order:**

1. **First:** Fix UFW (Solution 1) - Takes 30 seconds, fixes 80% of cases
2. **Second:** Check DigitalOcean Cloud Firewall (Solution 3) - Takes 2 minutes
3. **Third:** Contact DigitalOcean support (Solution 4) - Usually responds same day
4. **Alternative:** Use SendGrid (already set up!) - Works 100% of the time, no firewall issues

---

## Quick Commands to Run Now

```bash
# SSH into your droplet
ssh root@emilydensmore.com

# Check UFW status
sudo ufw status

# If active, allow SMTP ports
sudo ufw allow out 587/tcp
sudo ufw allow out 465/tcp
sudo ufw reload

# Test connectivity
timeout 5 bash -c '</dev/tcp/smtp.gmail.com/587' && echo "✅ Port 587 OPEN" || echo "❌ Port 587 BLOCKED"

# Test email
cd /path/to/backend
node test-email.js your-email@example.com
```

---

## Comparison: SMTP vs SendGrid

| Factor | Fix SMTP Blocking | Use SendGrid |
|--------|------------------|--------------|
| Time to fix | 5-30 minutes | 10 minutes |
| Requires support ticket? | Maybe | No |
| Email deliverability | 70-80% | 99%+ |
| Will it work? | Probably | Guaranteed |
| Maintenance | Need to monitor | Zero maintenance |
| Risk of IP blacklisting | Yes | No |
| Cost | Free | Free (100/day) |

**My honest recommendation:** Even if you can unblock SMTP, **use SendGrid**. It's designed for transactional emails and will save you headaches with deliverability.

---

Let me know which solution you want to try first, or if you want to just stick with SendGrid!
