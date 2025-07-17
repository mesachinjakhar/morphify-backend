/**
 * src/routes/photo.routes.ts
 * * This is our "Waiter" for the photo section of the restaurant.
 * It listens for specific URLs and knows to take those orders to the Head Chef.
 */
import { Router } from "express";
import { PhotoHandler } from "../handlers/photoHandler";
import authMiddleware from "../middlewares/authMiddleware";

const router = Router();
const photoHandler = new PhotoHandler();

// This tells the Waiter to listen for any POST order at the URL '/generate/:provider/:model'.
// When it gets one, it calls the `generatePhoto` function on the Head Chef.
router.post(
  "/generate/:provider/:model",
  authMiddleware,
  photoHandler.requestPhotoGeneration
);

router.get("/ai-filters", photoHandler.getAllAiFilters);
router.post("/cost", authMiddleware, photoHandler.getCost);

export default router;
