"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamFile = streamFile;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const mime_types_1 = __importDefault(require("mime-types"));
/**
 * Streams a file from the server's public directory with appropriate
 * Content-Type and Content-Disposition headers to force download.
 *
 * @param res Express response object
 * @param filePath Absolute path to the file to be streamed
 */
function streamFile(res, filePath) {
    if (!fs_1.default.existsSync(filePath)) {
        res.status(404).send('File not found');
        return;
    }
    const mimeType = mime_types_1.default.lookup(filePath) || 'application/octet-stream';
    const fileName = path_1.default.basename(filePath);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(filePath);
}
