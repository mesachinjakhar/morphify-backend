// filter.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const insertShowcase = async (id) => {
  const data = await prisma.showcaseImagePair.create({
    data: {
      showcaseId: id,
      beforeImage: "https://morphify-cdn.botcmd.com/ai-filters/catbefore.jpg",
      afterImage: "https://morphify-cdn.botcmd.com/ai-filters/catoutput.png",
    },
  });
  console.log(data.id);
};

insertShowcase("900fd5ff-1716-45a2-bbf5-d1726282a2dd");
