import { z } from "zod";

const emailSchema = z.string().email("Invalid email address");

export const validateEmail = (email: string) => {
  const result = emailSchema.safeParse(email);
  if (!result.success) {
    return false;
  }
  return true; // No error
};
