// This file acts as a bridge for cPanel Passenger to find the Next.js standalone server
const path = require('path');

// 1. Force load the .env file from the standalone directory
require('dotenv').config({ path: path.join(__dirname, '.next', 'standalone', '.env') });

// 2. Start the standalone server
const serverPath = path.join(__dirname, '.next', 'standalone', 'server.js');
require(serverPath);
