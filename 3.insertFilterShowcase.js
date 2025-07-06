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

insertFilterShowcase("d8ee4885-d326-4111-9eec-b6c2c443f750");
