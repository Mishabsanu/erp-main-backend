import fs from "fs";
import cloudinary from "../config/cloudinary.js";

/**──────── Local-file cleanup ────────**/
export const deleteFile = (path) => {
  if (!path) return;
  fs.unlink(path, (err) => {
    if (err) console.error(`Failed to delete temp file: ${path}`, err);
  });
};

/**──────── Extract publicId from cloudinary url ────────**
 * Works for:
 * https://res.cloudinary.com/.../upload/v173/products/cat.img.png
 * publicId: products/cat.img
 */
export const getPublicId = (url) => {
  if (!url) return null;
  // extract everything between "/upload/" and last extension
  const regex = /upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/;
  const match = url.match(regex);
  return match?.[1] || null;
};

/**──────── Protected cloudinary delete (silent) ────────**/
export const deleteFromCloudinary = async (url) => {
  try {
    const publicId = getPublicId(url);
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
    });
  } catch (err) {
    console.log("Cloudinary delete failed:", err?.message);
  }
};

/**──────── Smart upload with guaranteed cleanup ────────**/
export const uploadToCloud = async (file, folder) => {
  try {
    return await cloudinary.uploader.upload(file.path, {
      folder,
      timeout: 120000,
      resource_type: "auto",
      quality: "auto",
      fetch_format: "auto",
    });
  } finally {
    deleteFile(file.path);
  }
};

/**──────── Safe JSON / array parser ────────**/
export const safeParseArray = (val) => {
  if (!val) return [];
  try {
    if (typeof val === "string") {
      if (val.trim().startsWith("[")) return JSON.parse(val);
      if (val.includes(",")) return val.split(",").map((x) => x.trim());
      return [val.trim()];
    }
    if (Array.isArray(val)) return val;
    return [];
  } catch {
    return [];
  }
};

export const batchDelete = async (urls = []) => {
  await Promise.allSettled(urls.map((url) => deleteFromCloudinary(url)));
};

export const batchUpload = async (files = [], folder) => {
  const results = await Promise.allSettled(
    files.map((file) => uploadToCloud(file, folder))
  );

  return results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value.secure_url);
};

export const uploadWithKey = async (file, folder, sku) => {
  const key = generateImageKey(file, folder, sku);

  try {
    const uploaded = await cloudinary.uploader.upload(file.path, {
      public_id: key,
      resource_type: "auto",
      overwrite: true,
      timeout: 120000,
      quality: "auto",
      fetch_format: "auto",
    });

    return {
      key,               // store in DB
      url: uploaded.secure_url,
    };
  } finally {
    deleteFile(file.path);
  }
};

export const batchUploadWithKey = async (files = [], folder, sku) => {
  const results = await Promise.allSettled(
    files.map((file) => uploadWithKey(file, folder, sku))
  );

  return results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value); // {key, url}
};
