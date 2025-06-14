import { fal } from "@fal-ai/client";
import { BaseModel } from "./BaseModel";

export class FalAIModel extends BaseModel {
  constructor() {
    super();
  }

  public async trainModel(zipUrl: string, triggerWord: string) {
    const { request_id, response_url } = await fal.queue.submit(
      "fal-ai/flux-lora-fast-training",
      {
        input: {
          images_data_url: zipUrl,
          trigger_word: triggerWord,
        },
        webhookUrl: `https://morphify.botcmd.com/api/ai-photos/fal-ai/webhook/train`,
      }
    );
    return { request_id, response_url };
  }

  public async generateImage(
    prompt: string,
    tensorPath: string,
    numOfImages: number
  ) {
    const { request_id, response_url } = await fal.queue.submit(
      "fal-ai/flux-lora",
      {
        input: {
          prompt: prompt,
          loras: [{ path: tensorPath, scale: 1 }],
          num_images: numOfImages,
          image_size: "square_hd",
          output_format: "png",
          enable_safety_checker: true,
        },
        webhookUrl: `https://morphify.botcmd.com/api/ai-photos/fal-ai/webhook/image`,
      }
    );
    return { request_id, response_url };
  }

  public async deblur(imgaeUrl: string) {
    const { request_id, response_url } = await fal.queue.submit(
      "fal-ai/nafnet/deblur",
      {
        input: {
          image_url:
            "https://storage.googleapis.com/falserverless/nafnet/blurry.png",
        },
        webhookUrl: `https://morphify.botcmd.com/api/ai-filters/fal-ai/webhook/deblur`,
      }
    );
    return { request_id, response_url };
  }
}
