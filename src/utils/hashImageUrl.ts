import { createHash } from "crypto";

export function getUrlHash(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}
