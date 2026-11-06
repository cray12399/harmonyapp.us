const { Resend } = require("resend");

console.log("[EMAIL SERVICE MODULE] Loaded successfully.");

const sendVerificationEmail = async (email, code) => {
  console.log(`[EMAIL SERVICE] sendVerificationEmail invoked for recipient: ${email}`);

  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL SERVICE] RESEND_API_KEY is missing. [DEV ONLY] Code for ${email}: ${code}`);
    return;
  }

  console.log("[EMAIL SERVICE] Initializing Resend client instance...");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const payload = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Verify your Harmony account",
    text: `Your Harmony verification code is ${code}. It expires in 10 minutes.`,
  };

  console.log("[EMAIL SERVICE] Dispatching payload to Resend API:", JSON.stringify({
    ...payload,
    text: "[REDACTED]"
  }));

  try {
    const response = await resend.emails.send(payload);
    console.log("[EMAIL SERVICE] Raw response received from Resend API library:", JSON.stringify(response, null, 2));

    if (response && response.error) {
      console.error("[EMAIL SERVICE] Resend returned a structured error object:", JSON.stringify(response.error, null, 2));
      throw new Error(`Resend API Error: ${response.error.message || JSON.stringify(response.error)}`);
    }

    console.log("[EMAIL SERVICE] Email dispatched successfully!");
    return response.data;
  } catch (err) {
    console.error("==================================================");
    console.error("[EMAIL SERVICE] FATAL EXCEPTION CAUGHT IN RESEND DISPATCH:");
    console.error("- Name:", err.name);
    console.error("- Message:", err.message);
    console.error("- Stack:", err.stack);
    console.error("- Full Error Stringified:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    console.error("==================================================");
    throw err;
  }
};

module.exports = { sendVerificationEmail };
