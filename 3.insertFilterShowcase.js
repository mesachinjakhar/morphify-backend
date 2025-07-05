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

insertFilterShowcase("22315796-d092-46ce-bbcc-174b5b395c49");
