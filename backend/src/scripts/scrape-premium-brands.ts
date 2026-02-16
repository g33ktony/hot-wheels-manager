import axios from 'axios';
import * as cheerio from 'cheerio';
import { mergeCarsIntoJSON } from '../services/hotWheelsCacheService';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { HotWheelsCarModel } from '../models/HotWheelsCar';

dotenv.config();

/**
 * Scraper for Mini GT and Other Premium Brands
 * This is a proof-of-concept that can be expanded.
 */

async function scrapeMiniGT() {
  console.log('🚀 Starting Mini GT Scrape (TSM Models)...');
  console.log('⏳ Scraping all 102 pages (optimized with parallel requests)...');
  const cars: any[] = [];
  
  // Process pages in batches of 5 for faster scraping
  const BATCH_SIZE = 5;
  const TOTAL_PAGES = 102;
  
  for (let batchStart = 1; batchStart <= TOTAL_PAGES; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, TOTAL_PAGES);
    console.log(`📄 Scraping pages ${batchStart}-${batchEnd}...`);
    
    // Create requests for all pages in this batch
    const batchRequests = [];
    for (let p = batchStart; p <= batchEnd; p++) {
      const baseUrl = `https://minigt.tsm-models.com/index.php?action=product-list&p=${p}`;
      batchRequests.push(
        axios.get(baseUrl).catch(error => {
          console.error(`❌ Error scraping page ${p}:`, error.message);
          return null;
        })
      );
    }
    
    // Wait for all requests in batch to complete
    const responses = await Promise.all(batchRequests);
    
    // Process each response
    for (const response of responses) {
      if (!response) continue;
      
      const $ = cheerio.load(response.data);
      
      // Mini GT structure: .product_box contains img, then next div has name and SKU
      $('div.product_box').each((_, el) => {
        const container = $(el);
        const parent = container.parent();
        
        // Extract image
        const imgSrc = container.find('img').attr('src');
        const photo = imgSrc ? `https://minigt.tsm-models.com/${imgSrc}` : '';
        
        // Extract name from the link with class h6
        const nameElement = parent.find('a.text-dark.font-weight-bold');
        const name = nameElement.text().trim();
        
        // Extract SKU from the <p> tag in the next div
        const codeElement = parent.find('p:first');
        const code = codeElement.text().trim().toUpperCase();
        
        if (name && name.length > 5 && code) {
          // Detect Brand
          let brand = 'Mini GT';
          if (name.toLowerCase().includes('kaido house')) {
            brand = 'Kaido House';
          }

          cars.push({
            toy_num: code,
            carModel: name,
            series: brand === 'Kaido House' ? 'Kaido House Collection' : 'Mini GT Global',
            brand: brand,
            photo_url: photo || '',
            year: new Date().getFullYear().toString(),
          });
        }
      });
    }
    
    // Small delay between batches to be respectful to server
    if (batchEnd < TOTAL_PAGES) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Remove duplicates by toy_num
  const uniqueCars = Array.from(new Map(cars.map(c => [c.toy_num, c])).values());

  console.log(`✅ Found ${uniqueCars.length} items from Mini GT / Kaido House.`);
  return uniqueCars;
}


async function scrapePopRace() {
  console.log('🚀 Starting Pop Race Scrape...');
  const cars: any[] = [];
  
  try {
    const baseUrl = 'https://poprace.net/en/category.php';
    const response = await axios.get(baseUrl);
    const $ = cheerio.load(response.data);
    
    // Pop Race structure: a.image-text__link with background-image and content divs
    $('a.image-text__link').each((_, el) => {
      const link = $(el);
      
      // Extract photo from background-image style
      // Format: background-image: url('../images/main_car_PR640044.png')
      const imgWrapper = link.find('.image-text__img-wrapper');
      const styleAttr = imgWrapper.attr('style') || '';
      const photoMatch = styleAttr.match(/url\(['"]?\.\.\/([^'"]+)['"]?\)/);
      const photo = photoMatch ? `https://poprace.net/${photoMatch[1]}` : '';
      
      // Extract name from h1.image-text__title
      const titleElement = link.find('.image-text__title');
      let name = titleElement.text().trim();
      // Remove line breaks
      name = name.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ');
      
      // Extract SKU/model from h2.image-text__copy
      const copyElement = link.find('.image-text__copy');
      const copyText = copyElement.text().trim();
      // Format is "ModelPR640044" or with space "Model PR640044"
      const skuMatch = copyText.match(/(PR\d{6})/);
      const code = skuMatch ? skuMatch[0] : '';
      
      if (name && name.length > 3 && code) {
        cars.push({
          toy_num: code,
          carModel: name,
          series: 'Pop Race',
          brand: 'Pop Race',
          photo_url: photo || '',
          year: new Date().getFullYear().toString(),
        });
      }
    });

    // Deduplicate
    const uniqueCars = Array.from(new Map(cars.map(c => [c.toy_num, c])).values());
    console.log(`✅ Found ${uniqueCars.length} Pop Race items.`);
    return uniqueCars;
  } catch (error) {
    console.error('❌ Error scraping Pop Race:', error);
    return [];
  }
}

async function scrapeKaidoHouse() {
  console.log('🚀 Starting Kaido House Scrape...');
  const cars: any[] = [];
  
  try {
    // Kaido House diecast collection
    const baseUrl = 'https://www.kaidohouse.com/collections/diecast';
    const response = await axios.get(baseUrl);
    const $ = cheerio.load(response.data);
    
    // Kaido House uses product cards - look for product links and images
    $('a[href*="/products/"]').each((_, el) => {
      const link = $(el);
      const href = link.attr('href') || '';
      
      // Skip non-diecast links
      if (!href.includes('kaido-gt') && !href.includes('kaido-nissan') && 
          !href.includes('kaido-toyota') && !href.includes('kaido-chevrolet') &&
          !href.includes('kaido-bmw') && !href.includes('kaido-datsun')) {
        return;
      }
      
      // Get the product card parent
      const card = link.closest('[class*="ProductCard"], div[class*="product"]');
      
      // Extract name from link aria-label or text content
      let name = link.attr('aria-label') || link.text().trim() || '';
      name = name.split('\n')[0].trim();
      
      // Extract image - look for img tag
      let photo = '';
      const imgEl = card.find('img').first();
      if (imgEl.length > 0) {
        photo = imgEl.attr('src') || imgEl.attr('data-src') || '';
      }
      
      // Extract SKU from URL
      const urlMatch = href.match(/kaido-([a-z0-9-]+)/i);
      let code = 'KH-UNKNOWN';
      
      // Try to extract KHMG code from name
      const khmgMatch = name.match(/(KHMG\d+)/i);
      if (khmgMatch) {
        code = khmgMatch[0];
      } else if (urlMatch) {
        code = `KH-${urlMatch[1].replace(/-/g, '').toUpperCase().substring(0, 12)}`;
      }
      
      if (name && name.length > 3) {
        // Ensure photo URL is complete
        if (photo && !photo.startsWith('http')) {
          if (photo.startsWith('/')) {
            photo = `https://www.kaidohouse.com${photo}`;
          } else {
            photo = `https://www.kaidohouse.com/${photo}`;
          }
        }
        
        // Avoid duplicates in same scrape
        if (!cars.find(c => c.toy_num === code && c.carModel === name)) {
          cars.push({
            toy_num: code,
            carModel: name,
            series: 'Kaido House Collection',
            brand: 'Kaido House',
            photo_url: photo || '',
            year: new Date().getFullYear().toString(),
          });
        }
      }
    });

    // Deduplicate
    const uniqueCars = Array.from(new Map(cars.map(c => [c.toy_num, c])).values());
    console.log(`✅ Found ${uniqueCars.length} Kaido House items.`);
    return uniqueCars;
  } catch (error) {
    console.error('❌ Error scraping Kaido House:', error);
    return [];
  }
}

async function main() {
  try {
    const allCars: any[] = [];
    
    // 1. Scrape Mini GT
    console.log('\n📦 Processing Brand Scrapes...\n');
    const miniGTCars = await scrapeMiniGT();
    if (miniGTCars.length > 0) {
      allCars.push(...miniGTCars);
    }
    
    // 2. Scrape Pop Race
    console.log('');
    const popRaceCars = await scrapePopRace();
    if (popRaceCars.length > 0) {
      allCars.push(...popRaceCars);
    }
    
    // 3. Scrape Kaido House
    console.log('');
    const kaidoCars = await scrapeKaidoHouse();
    if (kaidoCars.length > 0) {
      allCars.push(...kaidoCars);
    }
    
    // 4. Merge all into catalog
    if (allCars.length > 0) {
      console.log(`\n💾 Merging ${allCars.length} total items into Catalog...`);
      const added = mergeCarsIntoJSON(allCars);
      console.log(`✅ Added ${added} new items to the catalog database.`);
      
      // Also save to MongoDB if connected
      if (process.env.MONGODB_URI) {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🔗 Connected to MongoDB for sync...');
        
        let mongoAdded = 0;
        for (const car of allCars) {
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
      console.warn('⚠️ No items found to add. The websites might have changed.');
    }
  } catch (error) {
    console.error('CRITICAL ERROR:', error);
  }
}

// Only run if called directly
if (require.main === module) {
  main();
}
