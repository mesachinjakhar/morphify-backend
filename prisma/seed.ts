import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Check if AiProvider already exists
  const provider = await prisma.aiProvider.upsert({
    where: { id: "a76b84f0-678a-459b-91ef-25a68e1026a7" },
    update: {},
    create: {
      id: "a76b84f0-678a-459b-91ef-25a68e1026a7",
      name: "falai",
    },
  });

  // Check if AiModel already exists
  await prisma.aiModel.upsert({
    where: { id: "849a89f6-00d1-45e5-bd16-ee3a8f32597a" },
    update: {},
    create: {
      id: "849a89f6-00d1-45e5-bd16-ee3a8f32597a",
      name: "fluxlora",
      aiProviderId: provider.id,
      baseCostPerCall: 5,
      mstarsCostPerCall: 5,
    },
  });
}

main()
  .then(() => {
    console.log("Seeding completed ✅");
    prisma.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
