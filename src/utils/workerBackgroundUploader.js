import { Worker } from "../models/Worker.model.js";
import { uploadToCloud } from "../helper/cloudinaryHelper.js";

/**
 * Background worker to handle Cloudinary uploads for personnel documents
 * This allows the main request to redirect immediately while images process.
 */
export const processWorkerUploadsInBackground = async (workerId, files) => {
  try {
    console.log(`[Background] Processing documents for worker: ${workerId}`);
    
    const updateData = {};
    const fileFields = [
      'photo', 'cv', 'qidDoc', 'passportDoc', 
      'insuranceDoc', 'healthCardDoc', 'certificateDoc'
    ];

    for (const field of fileFields) {
      if (files[field] && files[field][0]) {
        try {
          console.log(`[Background] Uploading ${field}...`);
          const uploaded = await uploadToCloud(files[field][0], "workers");
          updateData[field] = uploaded.secure_url;
        } catch (err) {
          console.error(`[Background] Cloudinary upload failed for ${field}:`, err);
        }
      }
    }

    // Handle indexed skill certificates: skill_cert_0, skill_cert_1, etc.
    const worker = await Worker.findById(workerId);
    if (worker && worker.skills && worker.skills.length > 0) {
      let skillsChanged = false;
      for (let i = 0; i < worker.skills.length; i++) {
        const fieldName = `skill_cert_${i}`;
        if (files[fieldName] && files[fieldName][0]) {
          try {
            console.log(`[Background] Uploading certificate for skill ${i}...`);
            const uploaded = await uploadToCloud(files[fieldName][0], "workers");
            worker.skills[i].certificateDoc = uploaded.secure_url;
            skillsChanged = true;
          } catch (err) {
            console.error(`[Background] Skill upload failed for index ${i}:`, err);
          }
        }
      }
      if (skillsChanged) {
        updateData.skills = worker.skills;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await Worker.findByIdAndUpdate(workerId, updateData);
      console.log(`[Background] Profile updated successfully for worker: ${workerId}`);
    }
  } catch (err) {
    console.error("[Background] Critical error in worker file processing:", err);
  }
};
