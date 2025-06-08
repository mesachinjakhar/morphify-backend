import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: "https://d3ee0d800af5fa9493ee627e2202aadc.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "4b7889f1dbcc0d7d70c15cd1024d05fa",
    secretAccessKey:
      "2fedd4af4bf5586416bd6e862bdc528bb287afa76f0649e1cde9eb897dfa9fd8",
  },
});

const bucketName = "morphify";

const deleteAllObjects = async () => {
  try {
    const listCommand = new ListObjectsV2Command({ Bucket: bucketName });
    const data = await client.send(listCommand);

    if (!data.Contents || data.Contents.length === 0) {
      console.log("Bucket is already empty.");
      return;
    }

    for (const obj of data.Contents) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: obj.Key,
      });
      await client.send(deleteCommand);
      console.log(`Deleted: ${obj.Key}`);
    }

    console.log("✅ All objects deleted.");
  } catch (err) {
    console.error("❌ Error:", err);
  }
};

deleteAllObjects();
