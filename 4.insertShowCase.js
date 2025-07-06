// filter.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const insertShowcase = async (id) => {
  const data = await prisma.showcaseImagePair.create({
    data: {
      showcaseId: id,
      beforeImage:
        "https://morphify-cdn.botcmd.com/ai-filters/out_of_focus0666.jpg",
      afterImage: "https://morphify-cdn.botcmd.com/ai-filters/out.png",
    },
  });
  console.log(data.id);
};

insertShowcase("3685ea32-5cdf-477d-bed8-daaeb04bc5c5");
