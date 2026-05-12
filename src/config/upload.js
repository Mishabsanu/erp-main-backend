import multer from "multer";
import path from "path";
import fs from "fs";

// Disk storage for temporary files that will be processed later (e.g., uploaded to Cloudinary in background)
const uploadDir = path.join(process.cwd(), "uploads");

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(   
      null,
      `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(
        file.originalname
      )}`
    );
  },
});

export const uploadDisk = multer({
  storage: diskStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

// Memory storage for files that are processed directly from buffer (e.g., CSV imports)
export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});
