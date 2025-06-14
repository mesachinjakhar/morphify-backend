import { z } from "zod";

export const Deblur = z.object({
  imageUrl: z.string(),
});
