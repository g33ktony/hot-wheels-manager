#!/usr/bin/env node
require('dotenv').config();
const scrapeIntelligent = require('./dist/scripts/scrape-intelligent').default;

async function main() {
    try {
        console.log('🚀 Starting scraper with clean progress file...');
        const result = await scrapeIntelligent(true);
        console.log('\n✅ Scraping completed successfully');
        console.log('📊 Total vehicles retrieved:', Array.isArray(result) ? result.length : typeof result);
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

main();
