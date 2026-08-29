"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToLocal = uploadToLocal;
exports.uploadFileFromDisk = uploadFileFromDisk;
const cloudinary_1 = require("cloudinary");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Set STORAGE_MODE=local in .env for cPanel (local NVMe storage)
// Set STORAGE_MODE=cloudinary in .env for Vercel (cloud storage)
const crypto_2 = require("./crypto");
const isLocal = process.env.STORAGE_MODE === 'local';
/**
 * Upload a base64 file string to either Cloudinary or local storage.
 * Controlled by the STORAGE_MODE environment variable.
 */
async function uploadToLocal(fileString, folder) {
    if (!fileString)
        return null;
    const sanitized = (0, crypto_2.sanitizeIncomingPath)(fileString);
    if (!sanitized)
        return null;
    // If it's already a URL or local uploads path, just return it
    if (sanitized.startsWith('http') || sanitized.startsWith('/uploads'))
        return sanitized;
    // Route to the correct storage backend
    if (isLocal) {
        return uploadToLocalDisk(sanitized, folder);
    }
    else {
        return uploadToCloudinary(sanitized, folder);
    }
}
/**
 * Upload to Cloudinary (used on Vercel)
 */
async function uploadToCloudinary(fileString, folder) {
    try {
        let dataUri = fileString;
        if (!fileString.startsWith('data:')) {
            dataUri = `data:image/jpeg;base64,${fileString}`;
        }
        const result = await cloudinary_1.v2.uploader.upload(dataUri, {
            folder: `coolstaff/${folder}`,
            resource_type: 'auto',
        });
        return result.secure_url;
    }
    catch (err) {
        console.error(`Cloudinary upload error for ${folder}:`, err);
        return null;
    }
}
/**
 * Upload to local disk (used on cPanel)
 */
async function uploadToLocalDisk(fileString, folder) {
    try {
        let base64Data = fileString;
        let extension = 'bin';
        if (fileString.startsWith('data:')) {
            const matches = fileString.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const mimeType = matches[1];
                base64Data = matches[2];
                extension = mimeType.split('/')[1] || 'bin';
                if (extension === 'jpeg')
                    extension = 'jpg';
            }
            else {
                base64Data = fileString.split(',')[1] || fileString;
            }
        }
        else {
            extension = 'jpg';
        }
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${crypto_1.default.randomBytes(16).toString('hex')}.${extension}`;
        // Updated path to point to server's sibling public folder or server's own public folder
        const uploadDir = path_1.default.join(process.cwd(), 'public', 'uploads', folder);
        await (0, promises_1.mkdir)(uploadDir, { recursive: true });
        const filePath = path_1.default.join(uploadDir, fileName);
        await (0, promises_1.writeFile)(filePath, buffer);
        return `/uploads/${folder}/${fileName}`;
    }
    catch (err) {
        console.error(`Local upload error for ${folder}:`, err);
        return null;
    }
}
/**
 * Upload a local disk file (saved by multer) to the target storage backend (local public folder or Cloudinary)
 */
async function uploadFileFromDisk(filePath, folder) {
    if (!filePath)
        return null;
    if (isLocal) {
        const fileName = path_1.default.basename(filePath);
        return `/uploads/${folder}/${fileName}`;
    }
    else {
        try {
            const result = await cloudinary_1.v2.uploader.upload(filePath, {
                folder: `coolstaff/${folder}`,
                resource_type: 'auto',
            });
            const fs = require('fs');
            try {
                fs.unlinkSync(filePath);
            }
            catch (_) { }
            return result.secure_url;
        }
        catch (err) {
            console.error(`Cloudinary disk file upload error for ${folder}:`, err);
            return null;
        }
    }
}
