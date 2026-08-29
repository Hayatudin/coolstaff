"use strict";
async function main() {
    console.log('Fetching https://api.coolstaffagency.com/api/leaders...');
    try {
        const res = await fetch('https://api.coolstaffagency.com/api/leaders');
        console.log('Status:', res.status);
        const body = await res.text();
        console.log('Body:', body);
    }
    catch (err) {
        console.error('Fetch error:', err.message);
    }
}
main();
