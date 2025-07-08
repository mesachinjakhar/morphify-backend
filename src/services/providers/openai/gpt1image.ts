/**
 * src/services/providers/openai/image-edit.provider.ts
 * * This is the live implementation for the image edit provider.
 * It makes a real API call to OpenAI and handles all errors gracefully.
 */
import { convertToPng } from "../../../utils/convertToPng";
import CustomError from "../../../utils/CustomError"; // Assuming path is correct
import {
  IProvider,
  GenerateImageInput,
  GenerateImageOutput,
  ValidationResult,
} from "../provider.interface";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { preprocessImage } from "../../../utils/preprocessImage";
import { preprocessWithCache } from "../../../utils/preprocessWithCache";

// Input Schema
const ValidInputSchema = z.object({
  imageUrl: z
    .string()
    .url({ message: "A valid imageUrl string is required for this model." }),
});

type ValidInputType = z.infer<typeof ValidInputSchema>;

// Main Class
export class Gpt1ImageProvider implements IProvider {
  // Supported image extensions
  private supportedExtensions = ["png", "jpeg", "webp"];

  private getExtension(url: string): string {
    const cleanUrl = url.split("?")[0]; // remove query params
    const parts = cleanUrl.split(".");
    return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
  }

  // Step 1. Validate Body
  public validateInput(input: ValidInputType): ValidationResult {
    const parsedBody = ValidInputSchema.safeParse(input);

    // Supported image extensions

    if (parsedBody.success) {
      // All checks passed!
      return { isValid: true, message: "Validation passed" };
    } else {
      const errorMessage =
        parsedBody.error.errors[0]?.message || "Invalid input";
      return { isValid: false, message: errorMessage };
    }
  }

  // Step 2. Generate Image
  public async generateImage(
    input: GenerateImageInput
  ): Promise<GenerateImageOutput> {
    console.log("Model gpt-image-1 started processing image");

    let imageUrl = input.imageUrl;

    imageUrl = await preprocessWithCache(imageUrl, this.supportedExtensions);

    // const ext = this.getExtension(imageUrl);
    // const isSupported = this.supportedExtensions.includes("." + ext);

    // if (!isSupported) {
    //   console.log(`🔁 Converting unsupported image format ".${ext}" to .png`);
    //   imageUrl = await convertToPng(imageUrl);
    // }

    try {
      // In a real app, you would get this from a secure config file.
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        console.error(
          "CRITICAL: OPENAI_API_KEY is not set in the environment."
        );
        throw new Error(
          "Server configuration error. Unable to find OpenAPI Key"
        );
      }

      // --- Logic for handling multipart/form-data for image edits ---

      // 1. Fetch the user's image from the provided URL as a buffer.

      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });

      const imageBuffer = Buffer.from(imageResponse.data, "binary");

      // 4. Create a new form and append the image data, new mask, and prompt.
      const form = new FormData();
      form.append("image", imageBuffer, { filename: "input_image.png" });
      form.append(
        "prompt",
        `You are an image style‑transfer engine trained on Studio Ghibli concept art by Hayao Miyazaki. Recreate the input photo as if it were a hand‑painted cel model sheet from ‘My Neighbor Totoro.’\n\n─ Style references: Hayao Miyazaki watercolor concept sketches, soft graphite line art, analog film grain.\n─ Color palette: muted pastels (sage greens, dusty pinks, warm creams), gentle highlights, no harsh neons.\n─ Textures: visible watercolor brush strokes, light paper grain, diffuse edge bleed.\n─ Lighting: soft backlit glow, warm diffuse shadows, slight bloom around bright areas.\n─ Anatomy tweaks: maintain original pose but refine facial features with large, expressive eyes and subtle line shading on cheeks; smooth, gentle musculature.\n─ Background: simplify to a stylized Ghibli meadow—loose grass strokes, distant hills, minimal clutter.\n\nNegative: no photorealistic skin pores, no harsh shadows, no pixelation, no over‑saturated colors, no cartoon outlines too thick.\n\nOutput: a clean 1024×1024 PNG with transparent background, preserving the composition but fully re‑rendered in Ghibli’s signature look.`
      );
      form.append("n", "1");
      form.append("size", "1024x1024");
      // As per the docs, gpt-image-1 is supported for this endpoint.
      form.append("model", "gpt-image-1");

      // 5. Using axios to make a POST request to the OpenAI edits endpoint.
      const response = await axios.post(
        "https://api.openai.com/v1/images/edits", // <-- Using the EDITS endpoint
        form,
        {
          headers: {
            ...form.getHeaders(), // This correctly sets the multipart/form-data boundary
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      // FIXED: Convert the base64 response to an image file and save it.
      const b64Json = response.data.data[0].b64_json;
      if (!b64Json) {
        throw new Error("API response did not contain base64 image data.");
      }

      // // Convert the Base64 string to a Buffer.
      // const imageFileBuffer = Buffer.from(b64Json, "base64");

      // // Create a unique filename and define the path to save the image.
      // // Note: Ensure the 'public/images' directory exists at your project root.
      // const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.png`;
      // const imagesDir = path.join(process.cwd(), "public", "images");

      // // Create the directory if it doesn't exist
      // if (!fs.existsSync(imagesDir)) {
      //   fs.mkdirSync(imagesDir, { recursive: true });
      // }

      // const filePath = path.join(imagesDir, fileName);

      // // Write the file to the server's file system.
      // fs.writeFileSync(filePath, imageFileBuffer);

      // // The URL that will be returned to the client.
      // // Your Express app must be configured to serve static files from the 'public' folder.
      // const imageUrl = `/images/${fileName}`;

      // Returning the successful result in our standard format.
      return {
        type: "b64_json",
        data: b64Json,
        requestId: response.headers["x-request-id"] || "1234",
      };
    } catch (error: any) {
      // --- This is our translation and logging layer ---
      let developerLogMessage =
        "An unknown error occurred with the AI provider.";
      let userSafeErrorMessage =
        "The image could not be created at this time. Please try again later.";
      let statusCode = 500;

      // Check if it's a specific API response error from Axios.
      if (axios.isAxiosError(error) && error.response) {
        const apiErrorData = error.response.data?.error;
        developerLogMessage = `API Error from OpenAI: ${apiErrorData?.message || "No specific message."}`;
        statusCode = error.response.status;

        // Log the detailed error for the developer.
        console.error("API Error Response:", {
          statusCode: statusCode,
          message: developerLogMessage,
          provider: "openai",
          model: "gpt-image-1-edit",
          responseData: error.response.data,
        });
      } else {
        // It's a network error or some other issue.
        developerLogMessage = `${error.message}`;
        statusCode = 503; // Service Unavailable

        console.error("Network/Other Error:", {
          message: developerLogMessage,
          provider: "openai",
          model: "gpt-image-1-edit",
        });
      }

      // Finally, throw our generic, user-safe CustomError.
      // The global error handler will catch this and send the safe message to the user.
      throw new CustomError(userSafeErrorMessage, 500);
    }
  }
}
