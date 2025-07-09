import multer from "multer";
import path from "path";
import sharp from "sharp";
import { promises as fs } from "fs";
import { v4 as uuidv4 } from "uuid";

//format the filename as image-DD-MM-YYYY-16BitUuid.ext
const getFormattedFilename = (file) => {
  const currentDate = new Date();
  const formattedDate = currentDate
    .toISOString()
    .slice(0, 10)
    .split("-")
    .reverse()
    .join("-"); // Converts YYYY-MM-DD to DD-MM-YYYY

  const uniqueId = uuidv4().replace(/-/g, "").slice(0, 16); // Generate 16-character UUID

  return `image-${formattedDate}-${uniqueId}${path.extname(file.originalname)}`;
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Save images in the "uploads" folder
  },
  filename: (req, file, cb) => {
    cb(null, getFormattedFilename(file)); // Unique filename
  },
});

// File filter (only images)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpg, .jpeg, and .png files are allowed"), false);
  }
};

// Multer middleware
const upload = multer({ storage: storage, fileFilter: fileFilter });

// Compress image before saving it
const compressImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(); // No file uploaded, proceed with the request
    }

    // Use sharp to compress the image
    await sharp(req.file.path)
      // Resize the image (optional, adjust as needed)
      .resize(800)
      // Compress to 70% quality
      .jpeg({ quality: 70 })
      // Write the buffer back to the same file
      .toBuffer()
      .then(async (buffer) => {
        await fs.writeFile(req.file.path, buffer);
        // console.log("Image compressed successfully");
      });

    next();
  } catch (err) {
    console.error("Image compression error:", err);
    next(err);
  }
};

//After configuring Multer add these as middlewares in routes
export { upload, compressImage };
