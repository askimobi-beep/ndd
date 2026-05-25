import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  const HOST = process.env.HOST || "127.0.0.1";

  app.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on ${HOST}:${PORT}`);
  });
}

startServer();
