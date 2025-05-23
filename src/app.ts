import express from "express";
import dotenv from "dotenv";
import router from "./routes/index.js";
import errorHandler from "./middlewares/error-handler.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use("/api", router);
app.use(errorHandler);

export default app;
