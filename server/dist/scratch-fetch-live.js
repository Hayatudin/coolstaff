"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = __importDefault(require("https"));
function fetchLive() {
    console.log('Fetching live API error details...');
    https_1.default.get('https://api.coolstaffagency.com/api/candidates', (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('Status Code:', res.statusCode);
            console.log('Headers:', res.headers);
            console.log('Response Body:', data);
        });
    }).on('error', (err) => {
        console.error('Fetch error:', err);
    });
}
fetchLive();
