import nodemailer from "nodemailer";

function getTransport() {
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
