const nodemailer = require('nodemailer');

// Dacă SMTP-ul nu e configurat, mesajele revin „în mod demo":
// codul se afișează pe ecran (returned) în loc să fie trimis.
function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === '1',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendEmail(to, subject, text) {
  const transporter = getTransporter();
  if (!transporter) return { ok: false, demo: true, reason: 'SMTP neconfigurat (mod demo)' };
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, demo: false, reason: err.message };
  }
}

// SMS: integrat cu WhoSMS (sau alt gateway) când există API key.
// Fără cheie → mod demo (codul apare pe ecran).
async function sendSms(phone, text) {
  const token = process.env.SMS_API_TOKEN;
  if (!token) return { ok: false, demo: true, reason: 'Gateway SMS neconfigurat (mod demo)' };
  try {
    const res = await fetch('https://www.whosms.ro/api/ws/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        recipient: phone,
        message: text
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && !data.error) return { ok: true };
    return { ok: false, demo: false, reason: data.error || 'Eroare gateway SMS' };
  } catch (err) {
    return { ok: false, demo: false, reason: err.message };
  }
}

module.exports = { sendEmail, sendSms };
