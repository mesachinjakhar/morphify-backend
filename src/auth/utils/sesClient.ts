import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Create the SES client
const sesClient = new SESClient({
  region: "ap-south-1", // change to your SES region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface SendEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  from?: string; // optional override
}

export async function sendEmail({
  to,
  subject,
  htmlBody,
  textBody,
  from,
}: SendEmailParams) {
  const params = {
    Source: from || "no-reply@morphify.botcmd.com", // default from address
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: subject,
      },
      Body: {
        Html: {
          Data: htmlBody,
        },
        ...(textBody && {
          Text: {
            Data: textBody,
          },
        }),
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    console.log("SES send success", response);
    return response;
  } catch (error) {
    console.error("SES send error", error);
    throw error;
  }
}
