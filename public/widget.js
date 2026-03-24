(() => {
  const form           = document.getElementById('sw-subscribe-form');
  const submitBtn      = document.getElementById('sw-submit-btn');
  const formSection    = document.getElementById('sw-form-section');
  const successSection = document.getElementById('sw-success-section');

  if (!form) return; // guard if element not found

  const inputs = {
    'sw-first-name': document.getElementById('sw-first-name'),
    'sw-last-name':  document.getElementById('sw-last-name'),
    'sw-email':      document.getElementById('sw-email'),
  };

  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }

  function isLegitEmail(value) {
    const email = value.trim().toLowerCase();
    const [local, domain] = email.split('@');
    if (/^(test|fake|asdf|qwerty|noreply|donotreply|null|undefined|example|nope|xxx|aaa|bbb|123|abc)\d*$/.test(local)) return false;
    if (local.length < 2 || local.length > 64) return false;
    const disposable = new Set(['mailinator.com','guerrillamail.com','guerrillamail.net','guerrillamail.org','sharklasers.com','grr.la','spam4.me','trashmail.com','trashmail.me','trashmail.net','trashmail.at','trashmail.io','yopmail.com','yopmail.fr','tempr.email','dispostable.com','throwam.com','maildrop.cc','getairmail.com','filzmail.com','spamgourmet.com','fakeinbox.com','mailnull.com','spamspot.com']);
    if (disposable.has(domain)) return false;
    if (['example.com','example.net','example.org','test.com','localhost'].includes(domain)) return false;
    const parts = domain.split('.');
    if (parts.length < 2) return false;
    if (!/^[a-z]{2,10}$/.test(parts[parts.length - 1])) return false;
    if (/^(.)\1{2,}$/.test(parts[parts.length - 2])) return false;
    return true;
  }

  function showError(inputId, errorId, msg) {
    inputs[inputId].style.borderColor = '#ef4444';
    document.getElementById(errorId).textContent = msg;
    return false;
  }
  function clearError(inputId, errorId) {
    inputs[inputId].style.borderColor = '#d1d5db';
    document.getElementById(errorId).textContent = '';
  }

  Object.keys(inputs).forEach(id => {
    inputs[id].addEventListener('focus', () => {
      inputs[id].style.borderColor = '#667eea';
      inputs[id].style.boxShadow = '0 0 0 3px rgba(102,126,234,0.15)';
    });
    inputs[id].addEventListener('blur', () => { inputs[id].style.boxShadow = 'none'; });
    inputs[id].addEventListener('input', () => clearError(id, id + '-error'));
  });

  submitBtn.addEventListener('mouseover', () => { submitBtn.style.opacity = '0.92'; });
  submitBtn.addEventListener('mouseout',  () => { submitBtn.style.opacity = '1'; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = inputs['sw-first-name'].value.trim();
    const lastName  = inputs['sw-last-name'].value.trim();
    const email     = inputs['sw-email'].value.trim();

    Object.keys(inputs).forEach(id => clearError(id, id + '-error'));
    let valid = true;
    if (!firstName) valid = showError('sw-first-name', 'sw-first-name-error', 'First name is required.');
    if (!lastName)  valid = showError('sw-last-name',  'sw-last-name-error',  'Last name is required.');
    if (!email)                    valid = showError('sw-email', 'sw-email-error', 'Email address is required.');
    else if (!isValidEmail(email)) valid = showError('sw-email', 'sw-email-error', 'Please enter a valid email address.');
    if (!valid) return;

    if (!isLegitEmail(email)) { simulateSuccess(); return; }

    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
    submitBtn.style.cursor = 'not-allowed';
    submitBtn.textContent = 'Subscribing…';

    try {
      const res = await fetch('https://subscribe-8m41.onrender.com/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email }),
      });
      if (!res.ok) throw new Error();
      showSuccess();
    } catch {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
      submitBtn.textContent = 'Subscribe Now';
      alert('Something went wrong. Please try again later.');
    }
  });

  function simulateSuccess() {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
    submitBtn.textContent = 'Subscribing…';
    setTimeout(showSuccess, 900);
  }
  function showSuccess() {
    formSection.style.display = 'none';
    successSection.style.display = 'block';
  }
})();
