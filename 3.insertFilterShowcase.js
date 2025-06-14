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

insertFilterShowcase("f56170ab-5fca-427d-b116-158a9b16aa27");
