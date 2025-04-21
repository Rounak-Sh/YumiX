import nodemailer from "nodemailer";
import twilio from "twilio";

// Initialize twilio client if credentials are set
let twilioClient;
if (
  process.env.TWILIO_ACCOUNT_SID?.startsWith("AC") &&
  process.env.TWILIO_AUTH_TOKEN
) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

// Create email transporter
const createTransporter = () => {
  // Check for environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("Email configuration missing:", {
      EMAIL_USER: process.env.EMAIL_USER ? "Set" : "Missing",
      EMAIL_PASS: process.env.EMAIL_PASS ? "Set" : "Missing",
    });
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // For development only, remove in production
    },
  });
};

const transporter = createTransporter();

// Test the connection immediately
if (transporter) {
  transporter
    .verify()
    .then(() => {
      console.log("Email server connection successful");
    })
    .catch((error) => {
      console.error("Email server connection failed:", {
        message: error.message,
        code: error.code,
        command: error.command,
      });
    });
} else {
  console.error(
    "Email transporter creation failed - check your .env configuration"
  );
}

// Send verification email
export const sendVerificationEmail = async (email, otp) => {
  try {
    if (!transporter) {
      throw new Error(
        "Email transporter not configured - check your .env file"
      );
    }

    const mailOptions = {
      from: `"YumMix" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your YumMix Account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #23486A;">Welcome to YumMix! 🎉</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #FFCF50; background: #23486A; padding: 10px; text-align: center; border-radius: 5px;">${otp}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", {
      messageId: info.messageId,
      to: email,
    });
    return true;
  } catch (error) {
    console.error("Email sending failed:", {
      error: error.message,
      code: error.code,
      to: email,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
    return false;
  }
};

// Send verification SMS
export const sendVerificationSMS = async (phone, otp) => {
  try {
    if (!twilioClient) {
      console.error("SMS service not configured - check Twilio credentials");
      return false;
    }

    // Format phone number if needed
    let formattedPhone = phone;
    if (!phone.startsWith("+")) {
      formattedPhone = `+${phone}`;
    }

    const message = await twilioClient.messages.create({
      body: `Your YumMix verification code is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    console.log("SMS sent successfully:", {
      sid: message.sid,
      to: formattedPhone,
    });
    return true;
  } catch (error) {
    console.error("SMS sending failed:", {
      error: error.message,
      code: error.code,
      to: phone,
      twilioError: error.code,
    });
    return false;
  }
};
