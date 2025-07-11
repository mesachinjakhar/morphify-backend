// Import necessary modules from the Brevo SDK
// The package name has been updated to @getbrevo/brevo
import * as brevo from "@getbrevo/brevo";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// --- Configuration ---
// Initialize the Brevo API client once at the module level
const apiInstance = new brevo.TransactionalEmailsApi();

// Configure API key authorization
// It's highly recommended to store your API key securely in environment variables
const apiKey = apiInstance.authentications["apiKey"];
// Ensure BREVO_API_KEY is set in your .env file
apiKey.apiKey = process.env.BREVO_API_KEY || "YOUR_BREVO_API_KEY_HERE";

// --- Exported Email Sending Function ---
/**
 * Sends a transactional email using the Brevo API.
 * This function can be imported and called from other modules.
 *
 * @param senderEmail The email address of the sender.
 * @param senderName The name of the sender.
 * @param recipientEmail The email address of the recipient.
 * @param recipientName The name of the recipient.
 * @param subject The subject of the email.
 * @param htmlContent The HTML content of the email body.
 * @returns A Promise that resolves with the API response or rejects with an error.
 */
export async function sendBrevoEmail(
  senderEmail: string,
  senderName: string,
  recipientEmail: string,
  recipientName: string,
  subject: string,
  htmlContent: string
): Promise<any> {
  // Create an instance of SendSmtpEmail
  const sendSmtpEmail = new brevo.SendSmtpEmail();

  // Set sender information
  sendSmtpEmail.sender = {
    email: senderEmail,
    name: senderName,
  };

  // Set recipient information
  sendSmtpEmail.to = [
    {
      email: recipientEmail,
      name: recipientName,
    },
  ];

  // Set email subject and HTML content
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;

  // Optional: Add a text version of the email for better deliverability
  sendSmtpEmail.textContent = "Hello! This is the text version of your email.";

  // Optional: Add reply-to email
  // sendSmtpEmail.replyTo = { email: "replyto@example.com", name: "Reply To" };

  // Optional: Add CC recipients
  // sendSmtpEmail.cc = [{ email: "cc@example.com", name: "CC Recipient" }];

  // Optional: Add BCC recipients
  // sendSmtpEmail.bcc = [{ email: "bcc@example.com", name: "BCC Recipient" }];

  // Optional: Add headers
  // sendSmtpEmail.headers = { "Some-Custom-Header": "Unique-ID-12345" };

  // Optional: Add tags for tracking
  // sendSmtpEmail.tags = ["welcome-email", "new-user"];

  try {
    console.log(
      `Attempting to send email from ${senderEmail} to ${recipientEmail} with subject: "${subject}"`
    );
    // Call the sendTransacEmail method to send the email
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    return data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error; // Re-throw the error for further handling
  }
}

// --- Example Usage (for testing this file directly - uncomment to run) ---
/*
async function main() {
    const senderEmail = "no-reply@crew.botcmd.com"; // IMPORTANT: Use a verified sender email from your Brevo account
    const senderName = "Your App Name";
    const recipientEmail = "mesachinjakhar@gmail.com"; // Replace with the actual recipient email
    const recipientName = "Test User";
    const subject = "Hello from Brevo and Node.js!";
    const htmlContent = `
        <h1>Welcome!</h1>
        <p>This is a test email sent using <strong>Brevo's Node.js SDK</strong> and TypeScript.</p>
        <p>You can customize this content as needed.</p>
        <p>Best regards,<br>Your Team</p>
    `;

    try {
        await sendBrevoEmail(
            senderEmail,
            senderName,
            recipientEmail,
            recipientName,
            subject,
            htmlContent
        );
        console.log("Email sent successfully!");
    } catch (error) {
        console.error("Failed to send email:", error);
    }
}

// Call the main function to send the email when the script runs directly
// This block will only execute if the file is run directly (e.g., `node dist/sendEmail.js`)
// and not when it's imported as a module.
if (require.main === module) {
    main();
}
*/

export async function sendOtpEmail(options: {
  toEmail: string;
  toName: string;
  subject: string;
  parameter: string; // This will be your OTP
}) {
  // Define the sender details. These should be your verified Brevo sender.
  const senderEmail = "no-reply@crew.botcmd.com"; // IMPORTANT: Use your verified sender email from Brevo
  const senderName = "Morphify AI"; // Your application's name

  // Construct the HTML content, injecting the dynamic OTP parameter
  const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Your Morphify AI OTP</title>
          </head>
          <body style="font-family: Arial, sans-serif; color: #333;">
            <div style="max-width:600px; margin:auto; padding:20px;">
              <h1 style="background: linear-gradient(90deg, #00AEEF, #8E2DE2, #FF0080); -webkit-background-clip: text; color: transparent;">
                Morphify AI
              </h1>
              <p>Hello,</p>
              <p>Use the following one-time password (OTP) to verify your account & complete your sign-in:</p>
              <h2 style="color:#8E2DE2; letter-spacing: 2px;">${options.parameter}</h2>
              <p>This OTP is valid for 10 minutes. Please do not share it with anyone.</p>
              <p>If you did not request this, you can safely ignore this email.</p>
              <br/>
              <p>Thanks,<br/>Morphify AI Team</p>
            </div>
          </body>
        </html>
    `;

  try {
    await sendBrevoEmail(
      senderEmail,
      senderName,
      options.toEmail,
      options.toName,
      options.subject,
      htmlContent
    );
    console.log(`OTP email sent successfully to ${options.toEmail}`);
  } catch (error) {
    console.error(`Failed to send OTP email to ${options.toEmail}:`, error);
  }
}
