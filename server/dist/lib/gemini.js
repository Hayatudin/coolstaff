"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genAI = void 0;
exports.getGeminiModel = getGeminiModel;
const generative_ai_1 = require("@google/generative-ai");
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn('GEMINI_API_KEY not found in environment variables');
}
const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey || '');
exports.genAI = genAI;
function getGeminiModel(modelName = 'gemini-2.0-flash') {
    return genAI.getGenerativeModel({ model: modelName });
}
