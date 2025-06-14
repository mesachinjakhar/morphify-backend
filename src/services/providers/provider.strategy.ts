/**
 * src/services/providers/provider.strategy.ts
 * * This is the "Recipe Index" or "Factory".
 * Its job is to look at an order and return the correct "Specialist Cook" (Provider).
 */
import { IProvider } from "./provider.interface";
// We must import our new cook to add them to the index.
import { Gpt1ImageProvider } from "./openai/gpt1image";

/**
 * This function acts as our directory. Given a name, it finds the right cook.
 */
export const getProvider = (
  providerName: string,
  modelName: string
): IProvider | null => {
  // If the order is for the 'openai' kitchen...
  if (providerName === "openai") {
    // ADDING OUR NEW MODEL TO THE INDEX
    if (modelName === "gpt1image") {
      return new Gpt1ImageProvider();
    }
  }

  // If we want to add a 'stabilityai' kitchen later, we would add it here.
  // if (providerName === 'stabilityai') { ... }

  // If the model is not found in our index, we return null.
  return null;
};
