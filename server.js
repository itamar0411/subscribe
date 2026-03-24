require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const OR_AUTH = 'Basic ' + Buffer.from(`${process.env.OR_USER}:${process.env.OR_KEY}`).toString('base64');

app.post('/api/subscribe', async (req, res) => {
  const { firstName, lastName, email } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const response = await fetch('https://api.ownerrez.com/v2/guests', {
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
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('OwnerRez error:', response.status, body);
      return res.status(502).json({ error: 'Upstream error.' });
    }

    res.status(201).json({ success: true, guest: body });
  } catch (err) {
    console.error('Request failed:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
