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

async function buildTransportOptions({ overridePort } = {}) {
  ensureIpv4FirstDns();

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(overridePort || process.env.SMTP_PORT || 587);
  const user = process.env.NODE_MAILER_USER || process.env.SMTP_USER;
  const pass = process.env.NODE_MAILER_PASSWORD || process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error(
      "SMTP configuration is missing. Set NODE_MAILER_USER and NODE_MAILER_PASSWORD (or SMTP_USER and SMTP_PASS)"
    );
  }

  let transportHost = host;
  const tlsOptions = {};

  // Resolve SMTP host to IPv4 explicitly to avoid ENETUNREACH on networks without IPv6 route.
  try {
    const [ipv4Host] = await dns.promises.resolve4(host);
    if (ipv4Host) {
      transportHost = ipv4Host;
      tlsOptions.servername = host;
    }
  } catch (_error) {
    // If DNS A lookup fails, nodemailer will still try with the configured hostname.
  }

  return {
    host: transportHost,
    port,
    secure: port === 465,
    family: 4,
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 15000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 10000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 20000),
    tls: tlsOptions,
    auth: {
      user,
      pass,
    },
  };
}

async function getTransport(options = {}) {
  const transportOptions = await buildTransportOptions(options);
  return nodemailer.createTransport(transportOptions);
}

export async function sendEmail({ to, subject, text, html }) {
  const transporter = await getTransport();
  const from =
    process.env.NODE_MAILER_FROM_MAIL ||
    process.env.MAIL_FROM ||
    process.env.NODE_MAILER_USER ||
    process.env.SMTP_USER;

  const payload = {
    from,
    to,
    subject,
    text,
    html,
  };

  try {
    await transporter.sendMail(payload);
  } catch (error) {
    // Retry once on Gmail SSL port when STARTTLS route fails in restrictive networks.
    if (error?.code === "ENETUNREACH") {
      const retryTransport = await getTransport({ overridePort: 465 });
      await retryTransport.sendMail(payload);
      return;
    }

    throw error;
  }
}
