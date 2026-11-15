// backend/create-test-email.js
import nodemailer from 'nodemailer';

nodemailer.createTestAccount((err, account) => {
  if (err) {
    console.error('❌ Failed to create test account:', err.message);
    process.exit(1);
  }
  console.log('');
  console.log('✅ Ethereal account created!');
  console.log('─────────────────────────────────────────────');
  console.log('User:', account.user);
  console.log('Pass:', account.pass);
  console.log('Web Interface:', account.web);
  console.log('─────────────────────────────────────────────');
  console.log('');
  console.log('👉 Copy these values into backend/.env:');
  console.log('   SMTP_HOST=smtp.ethereal.email');
  console.log('   SMTP_PORT=587');
  console.log(`   SMTP_USER=${account.user}`);
  console.log(`   SMTP_PASS=${account.pass}`);
  console.log('');
});