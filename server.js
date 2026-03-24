require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OR_AUTH = 'Basic ' + Buffer.from(`${process.env.OR_USER}:${process.env.OR_KEY}`).toString('base64');

const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
});

function isLegitEmail(email) {
  const lower = email.trim().toLowerCase();
  const [local, domain] = lower.split('@');
  if (!local || !domain) return false;
  if (/^(test|fake|asdf|qwerty|noreply|donotreply|null|undefined|example|nope|xxx|aaa|bbb|123|abc)\d*$/.test(local)) return false;
  if (local.length < 2 || local.length > 64) return false;
  if (!/[aeiouy]/i.test(local)) return false;
  if (/[^aeiouy\d._-]{5,}/i.test(local)) return false;
  const disposable = new Set(['mailinator.com','guerrillamail.com','guerrillamail.net','guerrillamail.org','sharklasers.com','grr.la','spam4.me','trashmail.com','trashmail.me','trashmail.net','trashmail.at','trashmail.io','yopmail.com','yopmail.fr','tempr.email','dispostable.com','throwam.com','maildrop.cc','getairmail.com','filzmail.com','spamgourmet.com','fakeinbox.com','mailnull.com','spamspot.com']);
  if (disposable.has(domain)) return false;
  if (['example.com','example.net','example.org','test.com','localhost'].includes(domain)) return false;
  const parts = domain.split('.');
  if (parts.length < 2) return false;
  if (!/^[a-z]{2,10}$/.test(parts[parts.length - 1])) return false;
  if (/^(.)\1{2,}$/.test(parts[parts.length - 2])) return false;
  return true;
}

async function sendNotification({ firstName, lastName, email, status }) {
  const statusMap = {
    success:   { label: '✅ Successfully added to OwnerRez', subject: `New subscriber: ${firstName} ${lastName}` },
    suspicious: { label: '⚠️ Flagged as suspicious — not submitted', subject: `Suspicious subscription attempt` },
    error:     { label: '❌ OwnerRez error — not added to contacts', subject: `Subscription error: ${firstName} ${lastName}` },
  };
  const { label, subject } = statusMap[status];
  await mailer.sendMail({
    from: `"High Five Retreats" <${process.env.GMAIL_USER}>`,
    to: process.env.NOTIFY_EMAIL,
    subject,
    text: `New subscription form submission\n\nName:   ${firstName} ${lastName}\nEmail:  ${email}\nStatus: ${label}`,
    html: `
      <p><strong>New subscription form submission</strong></p>
      <table cellpadding="6">
        <tr><td><strong>Name</strong></td><td>${firstName} ${lastName}</td></tr>
        <tr><td><strong>Email</strong></td><td>${email}</td></tr>
        <tr><td><strong>Status</strong></td><td>${label}</td></tr>
      </table>
    `,
  });
}

app.get('/ping', (req, res) => res.sendStatus(200));

app.get('/test-email', async (req, res) => {
  try {
    const info = await mailer.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.NOTIFY_EMAIL,
      subject: 'Test email from Render',
      text: 'If you got this, email works on Render.',
    });
    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

app.post('/api/subscribe', (req, res) => {
  const { firstName, lastName, email } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  if (!isValidEmailFormat(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  // Respond immediately — OwnerRez + email happen in background
  res.status(201).json({ success: true });

  const legit = isLegitEmail(email);

  if (!legit) {
    sendNotification({ firstName, lastName, email, status: 'suspicious' }).catch(console.error);
    return;
  }

  fetch('https://api.ownerrez.com/v2/guests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': OR_AUTH,
    },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      email_addresses: [{ address: email, is_default: true }],
    }),
  })
    .then(r => {
      if (!r.ok) console.error('OwnerRez error:', r.status);
      return sendNotification({ firstName, lastName, email, status: r.ok ? 'success' : 'error' });
    })
    .catch(err => console.error('Background processing error:', err));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
