import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // your Gmail address
    pass: process.env.EMAIL_PASS  // your App Password (not Gmail password)
  }
});

/**
 * Sends an email using Nodemailer
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Subject line
 * @param {string} options.html - HTML content
 */
export const sendMail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"Exam Cell" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  };

  return transporter.sendMail(mailOptions);
};
