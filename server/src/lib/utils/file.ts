import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';

/**
 * Streams a file from the server's public directory with appropriate
 * Content-Type and Content-Disposition headers to force download.
 *
 * @param res Express response object
 * @param filePath Absolute path to the file to be streamed
 */
export function streamFile(res: Response, filePath: string) {
  if (!fs.existsSync(filePath)) {
    res.status(404).send('File not found');
    return;
  }

  const mimeType = mime.lookup(filePath) || 'application/octet-stream';
  const fileName = path.basename(filePath);

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.sendFile(filePath);
}
