import nodemailer from 'nodemailer';

// For demo purposes, we use Ethereal (a fake SMTP service)
// In production, replace this with Resend, SendGrid, or AWS SES
export const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: 'your_ethereal_user', // Get this from ethereal.email
    pass: 'your_ethereal_pass'
  }
});

export async function sendVerificationEmail(email, name, token) {
  const verifyLink = `http://localhost:5173/verify?token=${token}`;
  
  await transporter.sendMail({
    from: '"Burger Bombs" <noreply@burgerbombs.com>',
    to: email,
    subject: 'Verify your Burger Bombs Account',
    html: `
      <h2>Welcome, ${name}!</h2>
      <p>Please verify your email to start ordering.</p>
      <a href="${verifyLink}" style="background:#eab308;padding:10px 20px;color:black;text-decoration:none;border-radius:5px;font-weight:bold;">Verify Email</a>
      <p>Or copy this link: ${verifyLink}</p>
    `
  });
  
  console.log(`[mailer] Verification email sent to ${email}`);
  console.log(`[mailer] Verification Link: ${verifyLink}`);
}