import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env.js';

let transporter: Transporter | null = null;

export function isMailConfigured(): boolean {
  return Boolean(env.SMTP_USER && env.SMTP_PASS);
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      pool: true,
      maxConnections: 3
    });
  }
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string, text: string) {
  await getTransporter().sendMail({
    from: { name: env.MAIL_FROM_NAME, address: env.SMTP_USER },
    replyTo: 'levixfashions@gmail.com',
    to,
    subject,
    html,
    text
  });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Simple, email-client-safe LEVIX layout (tables + inline styles). */
export function brandedEmail(opts: { preheader: string; title: string; greeting: string; body: string; button: string; link: string; footnote: string }) {
  const { preheader, title, greeting, body, button, link, footnote } = opts;
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#efefef;font-family:Helvetica,Arial,sans-serif;color:#111">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efefef;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff">
<tr><td style="background:#000;padding:22px 28px;text-align:center"><span style="color:#fff;font-size:26px;font-weight:900;letter-spacing:8px">LEVIX</span></td></tr>
<tr><td style="padding:32px 28px 8px">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:.5px">${esc(title)}</h1>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6">${esc(greeting)}</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#333">${esc(body)}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#000"><a href="${esc(link)}" style="display:inline-block;padding:14px 28px;color:#fff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${esc(button)}</a></td></tr></table>
<p style="margin:24px 0 6px;font-size:12px;color:#666">If the button doesn't work, copy this link into your browser:</p>
<p style="margin:0 0 20px;font-size:12px;word-break:break-all"><a href="${esc(link)}" style="color:#111">${esc(link)}</a></p>
<p style="margin:0 0 24px;font-size:12px;color:#666;line-height:1.5">${esc(footnote)}</p>
</td></tr>
<tr><td style="border-top:1px solid #eee;padding:18px 28px;font-size:11px;color:#888;text-align:center">LEVIX · Premium streetwear · <a href="https://thelevix.shop" style="color:#888">thelevix.shop</a></td></tr>
</table></td></tr></table></body></html>`;
  const text = `${title}\n\n${greeting}\n\n${body}\n\n${button}: ${link}\n\n${footnote}\n\nLEVIX · thelevix.shop`;
  return { html, text };
}
