// dependencies
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");
const crypto = require("crypto");

const prisma = new PrismaClient();

// configure Cloudflare R2
const r2 = new S3Client({
  region: "auto",
  endpoint: "https://d3ee0d800af5fa9493ee627e2202aadc.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "4b7889f1dbcc0d7d70c15cd1024d05fa",
    secretAccessKey:
      "2fedd4af4bf5586416bd6e862bdc528bb287afa76f0649e1cde9eb897dfa9fd8",
  },
});

const bucketName = "morphify";
const packsDir = path.join(__dirname, "packs");
const cdnDomain = "https://morphify-cdn.botcmd.com";

const formatPackName = (name) => {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const uploadToR2 = async (filePath, key) => {
  const fileStream = fs.createReadStream(filePath);
  const contentType = mime.lookup(filePath) || "application/octet-stream";

  await r2.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
    })
  );

  // Return URL with custom CDN domain
  return `${cdnDomain}/${key}`;
};

const processPack = async (packFolder) => {
  const name = formatPackName(packFolder);
  const fullPath = path.join(packsDir, packFolder);

  const files = fs.readdirSync(fullPath);
  const imageFiles = files.filter((f) => f.endsWith(".png"));
  const promptFile = files.find((f) => f === "prompts.txt");
  const descriptionFile = files.find((f) => f === "description.txt");

  if (!promptFile || !descriptionFile || imageFiles.length < 3) return;

  // upload images
  const uploadedImages = [];
  for (const img of imageFiles) {
    const filePath = path.join(fullPath, img);
    const key = `packs/${packFolder}/${crypto.randomUUID()}-${img}`;
    const url = await uploadToR2(filePath, key);
    uploadedImages.push(url);
  }

  // randomly pick thumbnail
  const shuffled = uploadedImages.sort(() => 0.5 - Math.random());
  const thumbnail = shuffled[0];
  const gallery = shuffled.slice(1);

  const description = fs
    .readFileSync(path.join(fullPath, descriptionFile), "utf-8")
    .trim();
  const prompts = JSON.parse(
    fs.readFileSync(path.join(fullPath, promptFile), "utf-8")
  );

  // insert into db
  const createdPack = await prisma.packs.create({
    data: {
      name,
      tumbnail: thumbnail,
      gallary: gallery,
      description,
      prompts: {
        create: prompts.map((prompt) => ({ prompt })),
      },
    },
  });

  console.log(`✅ Inserted pack: ${name}`);
};

const main = async () => {
  const packFolders = fs
    .readdirSync(packsDir)
    .filter((f) => fs.statSync(path.join(packsDir, f)).isDirectory())
    .map((f) => ({
      name: f,
      createdAt: fs.statSync(path.join(packsDir, f)).birthtimeMs,
    }))
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((f) => f.name);

  for (const folder of packFolders) {
    try {
      await processPack(folder);
    } catch (err) {
      console.error(`❌ Failed to process ${folder}:`, err);
    }
  }
  await prisma.$disconnect();
};

main();
