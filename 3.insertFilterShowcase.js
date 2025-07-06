// filter.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const insertFilterShowcase = async (id) => {
  const data = await prisma.aiFilterShowCase.create({
    data: {
      aiFilterId: id,
    },
  });
  console.log(data.id);
};

insertFilterShowcase("9c165c14-615a-48d7-9c90-dec7b85098f5");
