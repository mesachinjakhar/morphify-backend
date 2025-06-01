import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY as string,
    secretAccessKey: process.env.S3_SECRET_KEY as string,
  },
  endpoint: process.env.ENDPOINT, // or a custom domain if you've set that up
  region: "auto", // R2 doesn't use traditional AWS regions
});

export default s3;
