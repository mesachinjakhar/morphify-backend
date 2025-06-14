/**
 * src/services/providers/provider.interface.ts
 * * This is our "Rule Book".
 * It defines the contract that every AI provider must follow.
 */

// Defines what information is needed to generate an image.
export interface GenerateImageInput {
  prompt?: string;
  // Allows for any other provider-specific parameters (e.g., imageUrl).
  [key: string]: any;
}

// Defines what information we get back after an image is generated.
export type GenerateImageOutput =
  | { type: "url"; data: string; requestId?: string }
  | { type: "b64_json"; data: string; requestId?: string };

// NEW: Defines the structure for a validation result.
export interface ValidationResult {
  isValid: boolean;
  message: string;
  error?: string;
}

// The main rule for any "Specialist Cook" (Provider).
export interface IProvider {
  /**
   * Validates the input object to ensure it has all the necessary
   * properties and data types for this specific provider.
   * This is called BEFORE a job is queued.
   */
  validateInput(input: GenerateImageInput): ValidationResult;

  /**
   * The core method to generate an image. This is called by the
   * background worker AFTER a job has been queued and validated.
   */
  generateImage(input: GenerateImageInput): Promise<GenerateImageOutput>;
}
