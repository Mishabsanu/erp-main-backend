import { v4 as uuid } from "uuid";
import path from "path";

export const generateImageKey = (file, folder, sku) => {
  const ext = path.extname(file.originalname);      // .png
  const base = path.basename(file.originalname, ext); // screen
  const year = new Date().getFullYear();
  const unique = uuid(); // random unique string

  return `${folder}/${sku}/${year}/${unique}-${base}`;
};
