import {
  deleteFile,
  deleteFromCloudinary,
  uploadToCloud,
} from "../helper/cloudinaryHelper.js";

export const uploadFilesInBackground = async ({
  files,
  model,
  docId,
  field, // "attachments" OR "images"
  folder, // "sales" OR "products"
  isSingle = false, // true = single image, false = array
}) => {
  try {
    if (!files) return;
    if (!Array.isArray(files)) files = [files];

    console.log(`Background upload started for ${folder}/${field} on doc ${docId}`);
    
    const uploadPromises = files.map((file) =>
      uploadToCloud(file, folder)
        .then((uploaded) => {
          console.log(`Cloudinary upload success: ${uploaded.secure_url}`);
          return uploaded.secure_url;
        })
    );

    const uploadedUrls = await Promise.all(uploadPromises);
    console.log(`All files uploaded. Updating database field: ${field}`);

    if (isSingle) {
      const updatedDoc = await model.findByIdAndUpdate(docId, {
        [field]: uploadedUrls[0],
      }, { new: true });
      console.log(`Database update success for ${docId}. URL: ${uploadedUrls[0]}`);
    } else {
      await model.findByIdAndUpdate(docId, {
        $push: { [field]: { $each: uploadedUrls } },
      });
      console.log(`Database update success for ${docId} (multi-upload)`);
    }
  } catch (err) {
    console.error("Background upload failed:", err);
  }
};

export const deleteFilesInBackground = async (urls = []) => {
  try {
    if (!urls.length) return;
    await Promise.all(urls.map((url) => deleteFromCloudinary(url)));
  } catch (err) {
    console.error("Background delete failed:", err.message);
  }
};
