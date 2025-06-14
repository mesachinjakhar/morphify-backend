// index.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // 1. Create the provider (or find if it already exists)
  let provider = await prisma.aiProvider.create({
    data: {
      name: "openai",
    },
  });

  console.log("Provider ID:", provider.id);

  // 2. Create the model under that provider
  const model = await prisma.aiModel.create({
    data: {
      name: "gpt1image",
      baseCostPerCall: 0.15, // set real USD cost as needed
      mstarsCostPerCall: 5, // set your mstars cost
      aiProvider: {
        connect: { id: provider.id },
      },
    },
  });

  console.log("Created model:", model);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
