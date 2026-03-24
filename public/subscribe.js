(() => {
  const form = document.getElementById('subscribe-form');
  const submitBtn = document.getElementById('submit-btn');
  const formSection = document.getElementById('form-section');
  const successSection = document.getElementById('success-section');

  // --- Validation helpers ---

  function isValidEmail(value) {
    // Standard email format: local@domain.tld
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
  }

  /**
   * Silent legitimacy check — runs additional heuristics beyond format.
   * Returns false for addresses that look fake or disposable.
   * The caller should silently drop the submission if this returns false.
   */
  function isLegitEmail(value) {
    const email = value.trim().toLowerCase();
    const [local, domain] = email.split('@');

    // Reject clearly throwaway patterns in the local part
    const junkLocalPattern = /^(test|fake|asdf|qwerty|noreply|donotreply|null|undefined|example|nope|xxx|aaa|bbb|123|abc)\d*$/;
    if (junkLocalPattern.test(local)) return false;

    // Reject suspiciously short or long local parts
    if (local.length < 2 || local.length > 64) return false;

    // Reject known disposable / temporary email domains
    const disposableDomains = new Set([
      'mailinator.com', 'guerrillamail.com', 'guerrillamail.net',
      'guerrillamail.org', 'sharklasers.com', 'guerrillamailblock.com',
      'grr.la', 'guerrillamail.info', 'spam4.me', 'trashmail.com',
      'trashmail.me', 'trashmail.net', 'trashmail.at', 'trashmail.io',
      'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
      'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr',
      'courriel.fr.nf', 'moncourrier.fr.nf', 'monemail.fr.nf',
      'monmail.fr.nf', 'tempr.email', 'dispostable.com',
      'throwam.com', 'maildrop.cc', 'getairmail.com',
      'filzmail.com', 'throwam.com', 'spamgourmet.com',
      'fakeinbox.com', 'mailnull.com', 'spamspot.com',
    ]);
    if (disposableDomains.has(domain)) return false;

    // Reject example / placeholder domains (RFC 2606)
    const reservedDomains = ['example.com', 'example.net', 'example.org', 'test.com', 'localhost'];
    if (reservedDomains.includes(domain)) return false;

    // Domain must have at least one dot and a real-looking TLD (2–10 chars)
    const domainParts = domain.split('.');
    if (domainParts.length < 2) return false;
    const tld = domainParts[domainParts.length - 1];
    if (!/^[a-z]{2,10}$/.test(tld)) return false;

    // Reject domains with suspicious repetition like aaa.com, bbb.net
    const domainName = domainParts[domainParts.length - 2];
    if (/^(.)\1{2,}$/.test(domainName)) return false;

    return true;
  }

  function showError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    input.classList.add('invalid');
    error.textContent = message;
    return false;
  }

  function clearError(inputId, errorId) {
    document.getElementById(inputId).classList.remove('invalid');
    document.getElementById(errorId).textContent = '';
  }

  // Clear errors on input so the user gets live feedback after a failed attempt
  ['first-name', 'last-name', 'email'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      clearError(id, `${id}-error`);
    });
  });

  // --- Form submission ---

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = document.getElementById('first-name').value.trim();
    const lastName  = document.getElementById('last-name').value.trim();
    const email     = document.getElementById('email').value.trim();

    // Reset previous errors
    ['first-name', 'last-name', 'email'].forEach(id => clearError(id, `${id}-error`));

    let valid = true;

    if (!firstName) {
      valid = showError('first-name', 'first-name-error', 'First name is required.');
    }

    if (!lastName) {
      valid = showError('last-name', 'last-name-error', 'Last name is required.');
    }

    if (!email) {
      valid = showError('email', 'email-error', 'Email address is required.');
    } else if (!isValidEmail(email)) {
      valid = showError('email', 'email-error', 'Please enter a valid email address.');
    }

    if (!valid) return;

    // Silent legitimacy check — do not reveal the reason to the user
    if (!isLegitEmail(email)) {
      simulateSuccess(); // appear to succeed so bad actors get no signal
      return;
    }

    await submitSubscription({ firstName, lastName, email });
  });

  async function submitSubscription(data) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Subscribing…';

    try {
      const response = await fetch('https://subscribe-8m41.onrender.com/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      showSuccess();
    } catch (err) {
      console.error('Subscription error:', err);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Subscribe Now';
      alert('Something went wrong. Please try again later.');
    }
  }

  function simulateSuccess() {
    // Fake the same delay and outcome so the user experience is identical
    submitBtn.disabled = true;
    submitBtn.textContent = 'Subscribing…';
    setTimeout(showSuccess, 900);
  }

  function showSuccess() {
    formSection.style.display = 'none';
    successSection.style.display = 'block';
  }
})();
