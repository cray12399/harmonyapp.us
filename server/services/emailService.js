
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

module.exports = { sendVerificationEmail };
