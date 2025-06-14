// filter.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const insertShowcase = async (id) => {
  const data = await prisma.showcaseImagePair.create({
    data: {
      showcaseId: id,
      beforeImage: "https://morphify-cdn.botcmd.com/ai-filters/Pbefore.jpeg",
      afterImage: "https://morphify-cdn.botcmd.com/ai-filters/Pafter.png",
    },
  });
  console.log(data.id);
};

insertShowcase("458a562d-edb3-4b75-a3ff-2ce214bae40a");
