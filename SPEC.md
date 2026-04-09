# Subscribe Service — Spec

## Overview
A hosted subscription form that collects first name, last name, and email from visitors to highfiveretreats.com. Valid submissions are added as contacts in OwnerRez. The host receives an email notification for every submission attempt.

## Architecture
- **Backend**: Node.js / Express, hosted on Render (`https://subscribe-8m41.onrender.com`)
- **Frontend**: Static HTML/CSS/JS served by the same Express server
- **Embed**: Iframe embedded in OwnerRez via a custom HTML block
- **Source**: GitHub repo `itamar0411/subscribe`

## Form Fields
- First Name (required)
- Last Name (required)
- Email Address (required, validated for format)

## Submission Flow
1. Client validates fields (format check, required fields)
2. POST to `/api/subscribe`
3. Server responds `201` immediately (non-blocking)
4. In background:
   - Run gibberish detection on email local part (Hugging Face model)
   - If suspicious: send warning notification, skip OwnerRez
   - If legitimate: create contact in OwnerRez, send success notification

## Email Validation
### Format check (client + server)
- Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`

### Legitimacy check (server only)
- Reject known junk local patterns (`test`, `fake`, `asdf`, `qwerty`, etc.)
- Reject local parts shorter than 2 or longer than 64 characters
- Reject known disposable domains (mailinator, guerrillamail, yopmail, etc.)
- Reject reserved domains (`example.com`, `test.com`, `localhost`, etc.)
- Reject invalid TLDs (must be 2–10 alpha characters)
- Reject domains with suspicious repetition (e.g. `aaa.com`)
- **Hugging Face gibberish detection**: uses `madhurjindal/autonlp-Gibberish-Detector-492513457` to classify the email local part — flagged as suspicious if `noise` score > 0.5

## Notifications (SendGrid)
Sent to `host@highfiveretreats.com` for every submission:

| Status | Subject | Trigger |
|--------|---------|---------|
| ✅ Success | `New subscriber: First Last` | Contact added to OwnerRez |
| ⚠️ Suspicious | `Suspicious subscription attempt` | Email flagged as gibberish/disposable |
| ❌ Error | `Subscription error: First Last` | OwnerRez API returned an error |

## OwnerRez Integration
- API: `https://api.ownerrez.com/v2/guests`
- Auth: Basic Auth (`OR_USER:OR_KEY`)
- Payload: `first_name`, `last_name`, `email_addresses[{ address, is_default: true }]`

## Server Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/subscribe` | POST | Main subscription endpoint |
| `/ping` | GET | Health check / warmup |
| `/test-email` | GET | Sends a test notification email |

## Warmup
To avoid Render cold starts, paste this on the OwnerRez homepage via a custom HTML block:
```html
<script>
fetch('https://subscribe-8m41.onrender.com/ping', {
  method: 'GET',
  mode: 'no-cors'
}).catch(() => {});
</script>
```

## Embed Code
Paste into OwnerRez custom HTML block on the subscribe page:
```html
<iframe
  src="https://subscribe-8m41.onrender.com"
  style="width:100%;border:none;height:500px;display:block;background:#fff;"
  title="Subscribe for promotions"
></iframe>
```

## Environment Variables
| Variable | Description |
|----------|-------------|
| `OR_USER` | OwnerRez account email |
| `OR_KEY` | OwnerRez API key |
| `SENDGRID_KEY` | SendGrid API key |
| `NOTIFY_EMAIL` | Notification recipient (`host@highfiveretreats.com`) |
| `HF_KEY` | Hugging Face API token |
| `PORT` | Server port (default 3000) |

## Files
| File | Description |
|------|-------------|
| `server.js` | Express server — validation, OwnerRez, SendGrid, HF |
| `public/index.html` | Subscription form page |
| `public/subscribe.js` | Client-side form logic |
| `public/widget.js` | Alternate embed widget logic |
| `public/warmup.js` | Single-line ping script |
| `embed.html` | Iframe embed snippet |
| `warmup.html` | Warmup script snippet for OwnerRez |
