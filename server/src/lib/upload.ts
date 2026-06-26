import { v2 as cloudinary } from 'cloudinary';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set STORAGE_MODE=local in .env for cPanel (local NVMe storage)
// Set STORAGE_MODE=cloudinary in .env for Vercel (cloud storage)
const isLocal = process.env.STORAGE_MODE === 'local';

/**
 * Upload a base64 file string to either Cloudinary or local storage.
 * Controlled by the STORAGE_MODE environment variable.
 */
export async function uploadToLocal(fileString: string | null | undefined, folder: string) {
  if (!fileString) return null;

  // If it's already a URL, just return it
  if (fileString.startsWith('http') || fileString.startsWith('/uploads')) return fileString;

  // Route to the correct storage backend
  if (isLocal) {
    return uploadToLocalDisk(fileString, folder);
  } else {
    return uploadToCloudinary(fileString, folder);
  }
}

/**
 * Upload to Cloudinary (used on Vercel)
 */
async function uploadToCloudinary(fileString: string, folder: string): Promise<string | null> {
  try {
    let dataUri = fileString;
    if (!fileString.startsWith('data:')) {
      dataUri = `data:image/jpeg;base64,${fileString}`;
    }

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `coolstaff/${folder}`,
      resource_type: 'auto',
    });

    return result.secure_url;
  } catch (err) {
    console.error(`Cloudinary upload error for ${folder}:`, err);
    return null;
  }
}

/**
 * Upload to local disk (used on cPanel)
 */
async function uploadToLocalDisk(fileString: string, folder: string): Promise<string | null> {
  try {
    let base64Data = fileString;
    let extension = 'bin';

    if (fileString.startsWith('data:')) {
      const matches = fileString.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        base64Data = matches[2];
        extension = mimeType.split('/')[1] || 'bin';
        if (extension === 'jpeg') extension = 'jpg';
      } else {
        base64Data = fileString.split(',')[1] || fileString;
      }
    } else {
      extension = 'jpg';
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `${crypto.randomBytes(16).toString('hex')}.${extension}`;

    // Updated path to point to server's sibling public folder or server's own public folder
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    return `/uploads/${folder}/${fileName}`;
  } catch (err) {
    console.error(`Local upload error for ${folder}:`, err);
    return null;
  }
}

/**
 * Upload a local disk file (saved by multer) to the target storage backend (local public folder or Cloudinary)
 */
export async function uploadFileFromDisk(filePath: string | null | undefined, folder: string): Promise<string | null> {
  if (!filePath) return null;

  if (isLocal) {
    const fileName = path.basename(filePath);
    return `/uploads/${folder}/${fileName}`;
  } else {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: `coolstaff/${folder}`,
        resource_type: 'auto',
      });
      const fs = require('fs');
      try {
        fs.unlinkSync(filePath);
      } catch (_) {}
      return result.secure_url;
    } catch (err) {
      console.error(`Cloudinary disk file upload error for ${folder}:`, err);
      return null;
    }
  }
}
