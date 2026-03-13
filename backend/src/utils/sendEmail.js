import nodemailer from "nodemailer";
import dns from "node:dns";

let dnsOrderConfigured = false;

function ensureIpv4FirstDns() {
  if (dnsOrderConfigured) {
    return;
  }

  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch (_error) {
    // Ignore for Node.js versions that do not support result order override.
  }

  dnsOrderConfigured = true;
}

function getTransport() {
  ensureIpv4FirstDns();

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.NODE_MAILER_USER || process.env.SMTP_USER;
  const pass = process.env.NODE_MAILER_PASSWORD || process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error(
      "SMTP configuration is missing. Set NODE_MAILER_USER and NODE_MAILER_PASSWORD (or SMTP_USER and SMTP_PASS)"
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    family: 4,
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 15000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 20000),
    auth: {
      user,
      pass,
    },
  });
}

export async function sendEmail({ to, subject, text, html }) {
  const transporter = getTransport();
  const from =
    process.env.NODE_MAILER_FROM_MAIL ||
    process.env.MAIL_FROM ||
    process.env.NODE_MAILER_USER ||
    process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}
