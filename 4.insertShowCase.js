// filter.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const insertShowcase = async (id) => {
  const data = await prisma.showcaseImagePair.create({
    data: {
      showcaseId: id,
      beforeImage:
        "https://morphify-cdn.botcmd.com/ai-filters/restore_images_b3.jpeg",
      afterImage:
        "https://morphify-cdn.botcmd.com/ai-filters/restore_images_a3.png",
    },
  });
  console.log(data.id);
};

insertShowcase("726eb249-4a85-4ba5-87f5-b43c893e6813");
