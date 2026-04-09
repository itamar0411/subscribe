const request = require('supertest');

// Mock external dependencies before requiring the app
jest.mock('geoip-lite', () => ({
  lookup: jest.fn(),
}));

const geoip = require('geoip-lite');
const { app, isValidEmailFormat, isLegitEmail } = require('./server');

// Mock global fetch for HF and SendGrid/OwnerRez calls
global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  // Default: US IP
  geoip.lookup.mockReturnValue({ country: 'US' });
  // Default: HF returns non-gibberish
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => [[{ label: 'clean', score: 0.95 }, { label: 'noise', score: 0.05 }]],
    text: async () => '',
  });
});

// ─── isValidEmailFormat ───────────────────────────────────────────────────────

describe('isValidEmailFormat', () => {
  test('accepts valid emails', () => {
    expect(isValidEmailFormat('john@gmail.com')).toBe(true);
    expect(isValidEmailFormat('sarah.jones@yahoo.com')).toBe(true);
    expect(isValidEmailFormat('user+tag@domain.co')).toBe(true);
  });

  test('rejects missing @', () => {
    expect(isValidEmailFormat('notanemail')).toBe(false);
  });

  test('rejects missing domain', () => {
    expect(isValidEmailFormat('user@')).toBe(false);
  });

  test('rejects missing TLD', () => {
    expect(isValidEmailFormat('user@domain')).toBe(false);
  });

  test('rejects spaces', () => {
    expect(isValidEmailFormat('user @gmail.com')).toBe(false);
  });
});

// ─── isLegitEmail ─────────────────────────────────────────────────────────────

describe('isLegitEmail — junk local patterns', () => {
  test('rejects "test" local', async () => expect(await isLegitEmail('test@gmail.com')).toBe(false));
  test('rejects "fake" local', async () => expect(await isLegitEmail('fake@gmail.com')).toBe(false));
  test('rejects "asdf" local', async () => expect(await isLegitEmail('asdf@gmail.com')).toBe(false));
  test('rejects "qwerty" local', async () => expect(await isLegitEmail('qwerty@gmail.com')).toBe(false));
  test('rejects "noreply" local', async () => expect(await isLegitEmail('noreply@gmail.com')).toBe(false));
  test('rejects "123" local', async () => expect(await isLegitEmail('123@gmail.com')).toBe(false));
});

describe('isLegitEmail — local part length', () => {
  test('rejects 1-character local', async () => expect(await isLegitEmail('a@gmail.com')).toBe(false));
  test('accepts 2-character local', async () => expect(await isLegitEmail('jo@gmail.com')).toBe(true));
  test('rejects 65-character local', async () => {
    const long = 'a'.repeat(65);
    expect(await isLegitEmail(`${long}@gmail.com`)).toBe(false);
  });
});

describe('isLegitEmail — disposable domains', () => {
  test('rejects mailinator.com', async () => expect(await isLegitEmail('user@mailinator.com')).toBe(false));
  test('rejects guerrillamail.com', async () => expect(await isLegitEmail('user@guerrillamail.com')).toBe(false));
  test('rejects yopmail.com', async () => expect(await isLegitEmail('user@yopmail.com')).toBe(false));
  test('rejects trashmail.com', async () => expect(await isLegitEmail('user@trashmail.com')).toBe(false));
});

describe('isLegitEmail — reserved domains', () => {
  test('rejects example.com', async () => expect(await isLegitEmail('user@example.com')).toBe(false));
  test('rejects test.com', async () => expect(await isLegitEmail('user@test.com')).toBe(false));
  test('rejects localhost', async () => expect(await isLegitEmail('user@localhost')).toBe(false));
});

describe('isLegitEmail — blocked industry domains', () => {
  // Marketing platforms
  test('rejects mailchimp.com', async () => expect(await isLegitEmail('user@mailchimp.com')).toBe(false));
  test('rejects hubspot.com', async () => expect(await isLegitEmail('user@hubspot.com')).toBe(false));
  test('rejects klaviyo.com', async () => expect(await isLegitEmail('user@klaviyo.com')).toBe(false));
  // OTAs / property management
  test('rejects airbnb.com', async () => expect(await isLegitEmail('user@airbnb.com')).toBe(false));
  test('rejects vrbo.com', async () => expect(await isLegitEmail('user@vrbo.com')).toBe(false));
  test('rejects booking.com', async () => expect(await isLegitEmail('user@booking.com')).toBe(false));
  test('rejects guesty.com', async () => expect(await isLegitEmail('user@guesty.com')).toBe(false));
});

describe('isLegitEmail — invalid TLD', () => {
  test('rejects numeric TLD', async () => expect(await isLegitEmail('user@domain.123')).toBe(false));
  test('rejects TLD longer than 10 chars', async () => expect(await isLegitEmail('user@domain.toolongtldx')).toBe(false));
  test('accepts valid TLD', async () => expect(await isLegitEmail('user@domain.com')).toBe(true));
});

describe('isLegitEmail — suspicious domain repetition', () => {
  test('rejects aaa.com', async () => expect(await isLegitEmail('user@aaa.com')).toBe(false));
  test('rejects bbb.net', async () => expect(await isLegitEmail('user@bbb.net')).toBe(false));
});

describe('isLegitEmail — HF gibberish detection', () => {
  test('rejects local part with noise score > 0.5', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [[{ label: 'noise', score: 0.99 }, { label: 'clean', score: 0.01 }]],
    });
    expect(await isLegitEmail('asdfghjkl@gmail.com')).toBe(false);
  });

  test('allows local part with noise score <= 0.5', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [[{ label: 'clean', score: 0.9 }, { label: 'noise', score: 0.1 }]],
    });
    expect(await isLegitEmail('sarah@gmail.com')).toBe(true);
  });

  test('allows through if HF call fails', async () => {
    global.fetch.mockRejectedValueOnce(new Error('timeout'));
    expect(await isLegitEmail('sarah@gmail.com')).toBe(true);
  });
});

// ─── POST /api/subscribe ──────────────────────────────────────────────────────

describe('POST /api/subscribe — validation', () => {
  test('returns 400 if firstName missing', async () => {
    const res = await request(app).post('/api/subscribe').send({ lastName: 'Doe', email: 'jane@gmail.com' });
    expect(res.status).toBe(400);
  });

  test('returns 400 if lastName missing', async () => {
    const res = await request(app).post('/api/subscribe').send({ firstName: 'Jane', email: 'jane@gmail.com' });
    expect(res.status).toBe(400);
  });

  test('returns 400 if email missing', async () => {
    const res = await request(app).post('/api/subscribe').send({ firstName: 'Jane', lastName: 'Doe' });
    expect(res.status).toBe(400);
  });

  test('returns 400 if email format invalid', async () => {
    const res = await request(app).post('/api/subscribe').send({ firstName: 'Jane', lastName: 'Doe', email: 'notanemail' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for whitespace-only firstName', async () => {
    const res = await request(app).post('/api/subscribe').send({ firstName: '   ', lastName: 'Doe', email: 'jane@gmail.com' });
    expect(res.status).toBe(400);
  });

  test('returns 201 for valid submission', async () => {
    const res = await request(app).post('/api/subscribe').send({ firstName: 'Jane', lastName: 'Doe', email: 'jane@gmail.com' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/subscribe — geo check', () => {
  test('returns 201 for non-US IP (still responds success)', async () => {
    geoip.lookup.mockReturnValue({ country: 'IL' });
    const res = await request(app).post('/api/subscribe').send({ firstName: 'Jane', lastName: 'Doe', email: 'jane@gmail.com' });
    expect(res.status).toBe(201);
  });

  test('returns 201 for unknown IP (no geo data)', async () => {
    geoip.lookup.mockReturnValue(null);
    const res = await request(app).post('/api/subscribe').send({ firstName: 'Jane', lastName: 'Doe', email: 'jane@gmail.com' });
    expect(res.status).toBe(201);
  });
});

// ─── GET /ping ────────────────────────────────────────────────────────────────

describe('GET /ping', () => {
  test('returns 200', async () => {
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
  });
});
