"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_healing_1 = require("./lib/db-healing");
async function main() {
    console.log('Running schema healing...');
    try {
        await (0, db_healing_1.ensureDatabaseSchema)();
        console.log('Schema healing finished.');
    }
    catch (err) {
        console.error('Fatal error in schema healing execution:', err);
    }
}
main();
