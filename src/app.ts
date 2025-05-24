import app from "./createApp";

process.on("uncaughtException", (err) => {
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  server.close(() => {
    process.exit(1);
  });
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
