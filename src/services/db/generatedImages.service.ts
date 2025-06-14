import { prisma } from "../../lib/prisma";
import CustomError from "../../utils/CustomError";

export const insertForAiFilters = async (
  aiFilterId: string,
  userId: string
) => {
  if (!aiFilterId) {
    throw new CustomError("Ai Filter Id is not provided", 400);
  }
  const aiFilter = await prisma.aiFilter.findUnique({
    where: {
      id: aiFilterId,
    },
  });
  if (!aiFilter) {
    throw new CustomError(
      `Ai Filter Id not found with provided Id: ${aiFilterId}`,
      400
    );
  }

  const image = await prisma.generatedImages.create({
    data: {
      userId: userId,
      aiFilterId: aiFilterId,
    },
  });
  return image;
};

export const insertForPack = async (packId: string, userId: string) => {
  if (!packId) {
    throw new CustomError("Pack Id is not provided", 400);
  }
  const pack = await prisma.packs.findUnique({
    where: {
      id: packId,
    },
  });
  if (!pack) {
    throw new CustomError(`Pack not found with provided Id: ${packId}`, 400);
  }

  const image = await prisma.generatedImages.create({
    data: {
      userId: userId,
      packId: packId,
    },
  });
  return image;
};
