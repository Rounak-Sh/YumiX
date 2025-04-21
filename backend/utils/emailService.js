import nodemailer from "nodemailer";

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} [options.html] - HTML content (optional)
 * @param {Array} [options.attachments] - Email attachments (optional)
 * @returns {Promise<Object>} Nodemailer send info
 */
const sendEmail = async (options) => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Define email options
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
  };

  // Add HTML content if provided
  if (options.html) {
    mailOptions.html = options.html;
  }

  // Add attachments if provided
  if (options.attachments) {
    mailOptions.attachments = options.attachments;
  }

  try {
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export default sendEmail;
