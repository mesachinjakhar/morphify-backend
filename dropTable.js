import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const dropTable = async () => {
  await prisma.packs.deleteMany({});
};

dropTable();
