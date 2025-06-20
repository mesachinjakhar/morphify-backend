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
    const modelId = "849a89f6-00d1-45e5-bd16-ee3a8f32597a";
    const filterName = "Ghibli Studio Style";
    await createAiFilter(modelId, filterName);
  } catch (e) {
    console.error("Error creating AiFilter:", e);
  } finally {
    await prisma.$disconnect();
  }
})();
