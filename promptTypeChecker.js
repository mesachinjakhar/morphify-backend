import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updatePromptTypes() {
  try {
    const prompts = await prisma.packPrompts.findMany({
      select: {
        id: true,
        prompt: true,
      },
    });

    for (const promptEntry of prompts) {
      const { id, prompt } = promptEntry;
      let type = "OTHER";

      const lowerPrompt = prompt.toLowerCase();

      if (lowerPrompt.includes("woman")) {
        type = "WOMEN";
      } else if (lowerPrompt.includes("man")) {
        type = "MAN";
      }

      await prisma.packPrompts.update({
        where: { id },
        data: { type },
      });

      console.log(`Updated ${id} => ${type}`);
    }

    console.log("All prompts updated.");
  } catch (error) {
    console.error("Error updating prompts:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePromptTypes();
