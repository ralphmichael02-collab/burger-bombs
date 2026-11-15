// backend/src/utils/mailer.js
import nodemailer from 'nodemailer';
import 'dotenv/config';

// For demo purposes, we use Ethereal (fake SMTP)
// In production, replace with Resend, SendGrid, or AWS SES
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendVerificationEmail(email, name, token) {
  const verifyLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify?token=${token}`;

  try {
    await transporter.sendMail({
      from: '"Burger Bombs" <noreply@burgerbombs.com>',
      to: email,
      subject: 'Verify your Burger Bombs Account',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h2>Welcome, ${name}!</h2>
          <p>Please verify your email to start ordering.</p>
          <a href="${verifyLink}" style="display: inline-block; background: #2B4FB9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">Verify Email</a>
          <p style="color: #666; font-size: 12px;">Or copy this link: ${verifyLink}</p>
        </div>
      `
    });
    console.log(`[mailer] Verification email sent to ${email}`);
    console.log(`[mailer] Verification Link: ${verifyLink}`);
  } catch (err) {
    console.error('[mailer] Failed to send email:', err.message);
    // Log the link so you can still verify manually if SMTP fails
    console.log(`[mailer] Manual verification link: ${verifyLink}`);
  }
}