import { z } from "zod";

export const TrainModel = z.object({
  name: z.string(),
  type: z.enum(["MAN", "WOMEN", "OTHER"]),
  age: z.number(),
  ethnicity: z.enum([
    "WHITE",
    "BLACK",
    "ASIAN_AMERICAN",
    "EAST_ASIAN",
    "SOUTH_EAST_ASIAN",
    "SOUTH_ASIAN",
    "MIDDLE_EASTERN",
    "PACIFIC",
    "HISPANIC",
  ]),
  eyeColor: z.enum(["BROWN", "BLACK", "BLUE", "HAZEL", "GREY"]),
  bald: z.boolean(),
  zipUrl: z.string(),
});

export const GenerateImage = z.object({
  prompt: z.string(),
  modelId: z.string(),
  num: z.number(),
});

export const GenerateImagesFromPack = z.object({
  modelId: z.string(),
  packId: z.string(),
});
