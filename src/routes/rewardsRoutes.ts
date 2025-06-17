import { Router, Request, Response } from "express";

const router = Router();

router.get("/verify", (req: Request, res: Response) => {
  console.log("recieved paramets: ", req.query);
  res.status(200).json({ message: "Verification received" }); // send a proper response
  return;
});

export default router;
