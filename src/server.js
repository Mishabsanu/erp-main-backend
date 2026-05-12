import http from "http";
import app from "./app.js";
import { connectDB } from "./db/mongoose.js";
import { config } from "./config/index.js";

const server = http.createServer(app);

server.timeout = 300000; // Set timeout to 5 minutes (300,000 milliseconds)

const startServer = async () => {
  await connectDB();
  server.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
};

startServer();
