"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const file_1 = require("../lib/utils/file");
// Files are stored under the public/uploads directory
// The route expects a relative path (e.g., 'candidate/12345/document.pdf')
// and will resolve it safely inside the uploads folder.
const router = express_1.default.Router();
router.get('/:file(*)', (req, res) => {
    const { file } = req.params;
    // Clean path: replace backslashes and remove leading slashes
    let cleanPath = file.replace(/\\/g, '/').replace(/^\/+/, '');
    // Strip 'uploads/' if present to avoid duplication
    if (cleanPath.startsWith('uploads/')) {
        cleanPath = cleanPath.substring(8);
    }
    // Prevent directory traversal attacks
    cleanPath = path_1.default.normalize(cleanPath).replace(/^\.\.[/\\]/, '');
    const fullPath = path_1.default.join(process.cwd(), 'public', 'uploads', cleanPath);
    (0, file_1.streamFile)(res, fullPath);
});
exports.default = router;
