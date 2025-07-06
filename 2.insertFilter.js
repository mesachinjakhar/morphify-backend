// filter.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Creates an AiFilter linked to the given AiModel.
 *
 * @param {string} aiModelId    – The UUID of the AiModel to attach this filter to.
 * @param {string} name         – The display name of the filter.
 * @param {number} [additionalCost=0] – Extra mstars cost (defaults to 0).
 */
async function createAiFilter(aiModelId, name, additionalCost = 0) {
  const filter = await prisma.aiFilter.create({
    data: {
      name,
      additionalCost,
      aiModel: {
        connect: { id: aiModelId },
      },
    },
  });

  console.log("Created AiFilter:", filter);
  return filter;
}

// Example usage:
(async () => {
  try {
    const modelId = "6fb3c36c-4ff3-423c-b9ab-756c3489b6e9";
    const filterName = "Restore Old Images";
    await createAiFilter(modelId, filterName);
  } catch (e) {
    console.error("Error creating AiFilter:", e);
  } finally {
    await prisma.$disconnect();
  }
})();
