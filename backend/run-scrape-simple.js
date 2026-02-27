#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Import the scraper function
const scrapeIntelligent = require('./src/scripts/scrape-intelligent').default;

async function main() {
    try {
        console.log('🚀 Starting scraper (with clean progress file)...');
        const result = await scrapeIntelligent(true);
        console.log('\n✅ Scraping completed');
        console.log('📊 Total vehicles scraped:', result.length);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
