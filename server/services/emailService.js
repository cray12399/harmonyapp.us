
const { Resend } = require("resend");

const sendVerificationEmail = async (email, code) => {
  // Local testing without a Resend API key
  if (!process.env.RESEND_API_KEY) {
    console.log(`[DEV ONLY] Verification code for ${email}: ${code}`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Verify your Harmony account",
    text: `Your Harmony verification code is ${code}. It expires in 10 minutes.`,
  });

  if (error) {
    throw new Error(`Resend email failed: ${error.message}`);
  }

  return data;
};

// Send a password reset code
const sendPasswordResetEmail = async (email, code) => {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error("Email service is not configured");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Reset your Harmony password",
    text: `Your Harmony password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
  });

  if (error) {
    throw new Error("Failed to send password reset email");
  }

  return data;
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
