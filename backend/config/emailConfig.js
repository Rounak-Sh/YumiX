import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify the connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.log("SMTP connection error:", error);
  } else {
    console.log("SMTP Server is ready to take our messages");
  }
});

export default transporter;
