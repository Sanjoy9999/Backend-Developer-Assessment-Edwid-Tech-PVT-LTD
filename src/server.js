import app from "./app.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await app.initServices();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit process in dev/test for resilience
});

startServer();
