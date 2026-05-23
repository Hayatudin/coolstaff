import express, { Request, Response } from 'express';
import path from 'path';
import { streamFile } from '../lib/utils/file';

// Files are stored under the public/uploads directory
// The route expects a relative path (e.g., 'candidate/12345/document.pdf')
// and will resolve it safely inside the uploads folder.

const router = express.Router();

router.get('/:file(*)', (req: Request, res: Response) => {
  const { file } = req.params;
  // Prevent directory traversal attacks
  const safePath = path.normalize(file).replace(/^\.\.[/\\]/, '');
  const fullPath = path.join(process.cwd(), 'public', 'uploads', safePath);
  streamFile(res, fullPath);
});

export default router;
