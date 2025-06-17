import { Router, Request, Response } from "express";

const router = Router();

router.get("/verify", (req: Request, res: Response) => {
  console.log("recieved paramets: ", req.params);
  res.status(200);
  return;
});

export default router;
