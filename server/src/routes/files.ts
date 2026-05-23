import express, { Request, Response } from 'express';
import path from 'path';
import { streamFile } from '../lib/utils/file';

// Files are stored under the public/uploads directory
// The route expects a relative path (e.g., 'candidate/12345/document.pdf')
// and will resolve it safely inside the uploads folder.

const router = express.Router();

router.get('/:file(*)', (req: Request, res: Response) => {
  const { file } = req.params;
  
  // Clean path: replace backslashes and remove leading slashes
  let cleanPath = file.replace(/\\/g, '/').replace(/^\/+/, '');
  
  // Strip 'uploads/' if present to avoid duplication
  if (cleanPath.startsWith('uploads/')) {
    cleanPath = cleanPath.substring(8);
  }
  
  // Prevent directory traversal attacks
  cleanPath = path.normalize(cleanPath).replace(/^\.\.[/\\]/, '');
  
  const fullPath = path.join(process.cwd(), 'public', 'uploads', cleanPath);
  streamFile(res, fullPath);
});

export default router;
