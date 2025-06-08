import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const findOtherPrompt = async () => {
  const response = await prisma.packPrompts.findMany({
    where: { type: "OTHER" },
  });
  console.log(response.length);
};

findOtherPrompt();
