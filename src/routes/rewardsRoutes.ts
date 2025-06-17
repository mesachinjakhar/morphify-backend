import { Router, Request, Response } from "express";
import { PhotoHandler } from "../handlers/photoHandler";

const router = Router();

router.get("/verify", (req: Request, res: Response) => {
  console.log("recieved paramets: ", req.params);
  res.status(200);
});

export default router;
