import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY as string,
    secretAccessKey: process.env.S3_SECRET_KEY as string,
  },
  endpoint: process.env.ENDPOINT,
  region: "auto",
  forcePathStyle: true,
});

export default s3;
