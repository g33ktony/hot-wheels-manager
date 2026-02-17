import axios from 'axios';
import * as cheerio from 'cheerio';
import { mergeCarsIntoJSON } from '../services/hotWheelsCacheService';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { HotWheelsCarModel } from '../models/HotWheelsCar';

dotenv.config();

/**
 * Aggressive Amazon.jp scraper for premium diecast brands
 * Targets: Mini GT, Pop Race, Kaido House, Tomica
 * Strategy: Search results + pagination
 */

// User agents to rotate
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeAmazonJPBrand(brandSearchTerm: string, brandName: string, maxPages: number = 10) {
  console.log(`🚀 Starting Amazon.jp Scrape for ${brandName}...`);
  const cars: any[] = [];
  
  try {
    for (let page = 1; page <= maxPages; page++) {
      if (page % 3 === 1) {
        console.log(`📄 Scraping Amazon.jp ${brandName} page ${page}/${maxPages}...`);
      }

      try {
        // Amazon.jp search URL
        const searchUrl = `https://www.amazon.co.jp/s?k=${encodeURIComponent(brandSearchTerm)}&page=${page}&language=en`;
        
        const response = await axios.get(searchUrl, {
          timeout: 15000,
          headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          }
        });

        const $ = cheerio.load(response.data);
        let itemsFound = 0;

        // Amazon product card selectors
        const productSelectors = [
          'div[data-component-type="s-search-result"]',
          'div.s-result-item',
          'div.a-carousel-viewport div[data-index]',
        ];

        for (const selector of productSelectors) {
          $(selector).each((_, el) => {
            const card = $(el);
            
            // Extract product link
            const link = card.find('h2 a, h2 span a, a.a-link-normal').first();
            const href = link.attr('href') || '';
            const title = link.text().trim() || card.find('h2').text().trim();
            
            if (!href || !title) return;

            // Extract image
            let imageUrl = '';
            const img = card.find('img').first();
            if (img.length > 0) {
              imageUrl = img.attr('src') || img.attr('data-src') || '';
            }

            // Fix Amazon image URLs
            if (imageUrl && imageUrl.includes('amazon-adsystem')) {
              imageUrl = '';
            }

            // Extract ASIN from URL (Amazon's product ID)
            const asinMatch = href.match(/\/dp\/([A-Z0-9]{10})/);
            const asin = asinMatch ? asinMatch[1] : '';

            if (title && title.length > 5 && asin) {
              // Check for duplicates
              if (!cars.find(c => c.toy_num === `${brandName.toUpperCase()}-${asin}`)) {
                cars.push({
                  toy_num: `${brandName.toUpperCase()}-${asin}`,
                  carModel: title.substring(0, 200), // Limit title length
                  series: `${brandName} Collection`,
                  brand: brandName,
                  photo_url: imageUrl || '',
                  year: new Date().getFullYear().toString(),
                });
                itemsFound++;
              }
            }
          });

          if (itemsFound > 0) break; // Found items with this selector
        }

        // If no items found on this page, likely end of results
        if (itemsFound === 0 && page > 2) {
          console.log(`⏭️  No items on page ${page}, stopping search`);
          break;
        }

        // Respectful delay between requests - varied to avoid detection
        const randomDelay = 2000 + Math.random() * 3000; // 2-5 seconds
        await delay(randomDelay);

      } catch (error: any) {
        if (error.response?.status === 503) {
          // Service unavailable - back off harder
          console.warn(`⚠️ Amazon.jp returned 503 (rate limited) on page ${page}, backing off...`);
          await delay(10000); // Wait 10 seconds before retry
          page--; // Retry this page
        } else if (error.message.includes('timeout')) {
          console.warn(`⚠️ Timeout on page ${page}, continuing...`);
          await delay(5000);
        } else {
          console.warn(`⚠️ Error on page ${page}: ${error.message}`);
        }
      }
    }

    // Remove duplicates by toy_num
    const uniqueCars = Array.from(new Map(cars.map(c => [c.toy_num, c])).values());
    console.log(`✅ Found ${uniqueCars.length} ${brandName} items`);
    return uniqueCars;

  } catch (error) {
    console.error(`❌ Error scraping ${brandName}:`, error);
    return [];
  }
}

async function main() {
  try {
    const allCars: any[] = [];

    // 1. Scrape Mini GT (try multiple search terms)
    console.log('\n📦 Processing Amazon.jp Brand Scrapes...\n');
    
    let miniGTCars = await scrapeAmazonJPBrand('ミニGT 1/64', 'Mini GT', 25);
    if (miniGTCars.length < 200) {
      // Try alternative search
      const miniGT2 = await scrapeAmazonJPBrand('Mini GT TSM 1:64', 'Mini GT', 15);
      miniGTCars = [...new Map([...miniGTCars, ...miniGT2].map(c => [c.toy_num, c])).values()];
    }
    if (miniGTCars.length > 0) {
      allCars.push(...miniGTCars);
    }

    // 2. Scrape Pop Race
    console.log('');
    let popRaceCars = await scrapeAmazonJPBrand('Pop Race 1/64', 'Pop Race', 12);
    if (popRaceCars.length < 50) {
      const popRace2 = await scrapeAmazonJPBrand('ポップレーシング ダイキャスト', 'Pop Race', 8);
      popRaceCars = [...new Map([...popRaceCars, ...popRace2].map(c => [c.toy_num, c])).values()];
    }
    if (popRaceCars.length > 0) {
      allCars.push(...popRaceCars);
    }

    // 3. Scrape Kaido House
    console.log('');
    let kaidoCars = await scrapeAmazonJPBrand('KAIDO HOUSE 1/64', 'Kaido House', 10);
    if (kaidoCars.length < 50) {
      const kaido2 = await scrapeAmazonJPBrand('開道ハウス ダイキャスト', 'Kaido House', 8);
      kaidoCars = [...new Map([...kaidoCars, ...kaido2].map(c => [c.toy_num, c])).values()];
    }
    if (kaidoCars.length > 0) {
      allCars.push(...kaidoCars);
    }

    // 4. Scrape Tomica (MAIN BRAND - should have tons)
    console.log('');
    let tomicaCars = await scrapeAmazonJPBrand('トミカ 1/64', 'Tomica', 30);
    if (tomicaCars.length < 300) {
      // Try English search
      const tomica2 = await scrapeAmazonJPBrand('Tomica diecast 1/64', 'Tomica', 20);
      tomicaCars = [...new Map([...tomicaCars, ...tomica2].map(c => [c.toy_num, c])).values()];
    }
    if (tomicaCars.length > 0) {
      allCars.push(...tomicaCars);
    }

    // Remove any duplicates across all brands
    const allUniqueCars = Array.from(new Map(allCars.map(c => [c.toy_num, c])).values());

    if (allUniqueCars.length > 0) {
      console.log(`\n💾 Merging ${allUniqueCars.length} total items from Amazon.jp into Catalog...`);
      const added = mergeCarsIntoJSON(allUniqueCars);
      console.log(`✅ Added ${added} new items to the catalog database.`);

      // Sync to MongoDB if connected
      if (process.env.MONGODB_URI) {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🔗 Connected to MongoDB for sync...');

        let mongoAdded = 0;
        for (const car of allUniqueCars) {
          const exists = await HotWheelsCarModel.findOne({ toy_num: car.toy_num });
          if (!exists) {
            await HotWheelsCarModel.create(car);
            mongoAdded++;
          }
        }
        console.log(`✅ Synced ${mongoAdded} items to MongoDB.`);
        await mongoose.disconnect();
      }
    } else {
      console.warn('⚠️ No items found from Amazon.jp. The site structure may have changed.');
    }
  } catch (error) {
    console.error('CRITICAL ERROR:', error);
  }
}

// Only run if called directly
if (require.main === module) {
  main();
}
