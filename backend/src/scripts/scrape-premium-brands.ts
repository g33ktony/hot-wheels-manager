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
  const cars: any[] = [];
  
  // Scrape 25 pages (optimized from 50 for faster execution)
  const TOTAL_PAGES = 25;
  const MAX_RETRIES = 2;
  
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    if (p % 5 === 1) {
      console.log(`📄 Scraping pages ${p}-${Math.min(p + 4, TOTAL_PAGES)}...`);
    }
    
    let retries = 0;
    let success = false;
    
    while (retries < MAX_RETRIES && !success) {
      const baseUrl = `https://minigt.tsm-models.com/index.php?action=product-list&p=${p}`;
      
      try {
        const response = await axios.get(baseUrl, {
          timeout: 20000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        
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
            cars.push({
              toy_num: code,
              carModel: name,
              series: 'Mini GT Global',
              brand: 'Mini GT',
              photo_url: photo || '',
              year: new Date().getFullYear().toString(),
            });
          }
        });
        
        success = true;
      } catch (error: any) {
        retries++;
        if (retries < MAX_RETRIES) {
          // Exponential backoff: wait more between retries
          const waitTime = Math.min(500 * Math.pow(2, retries), 3000);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          // Silently continue on page failure (rate limiting)
        }
      }
    }
    
    // Respectful delay between requests - OPTIMIZED
    // Vary delays to avoid pattern detection
    const delay = 600 + Math.random() * 300; // 600-900ms
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Remove duplicates by toy_num
  const uniqueCars = Array.from(new Map(cars.map(c => [c.toy_num, c])).values());

  console.log(`✅ Found ${uniqueCars.length} Mini GT items.`);
  return uniqueCars;
}


async function scrapePopRace() {
  console.log('🚀 Starting Pop Race Scrape...');
  const cars: any[] = [];
  
  try {
    // Pop Race might have multiple pages
    let pageNum = 1;
    let foundItems = 0;
    const maxPages = 20;
    
    while (pageNum <= maxPages) {
      if (pageNum % 5 === 1) {
        console.log(`📄 Scraping Pop Race page ${pageNum}/${maxPages}...`);
      }
      
      const urls = [
        `https://poprace.net/en/category.php?page=${pageNum}`,
        `https://poprace.net/en/category.php?p=${pageNum}`,
        `https://poprace.net/en/products?page=${pageNum}`,
      ];
      
      let pageData = null;
      let response = null;
      
      for (const url of urls) {
        try {
          response = await axios.get(url, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          const $ = cheerio.load(response.data);
          const items = $('a.image-text__link').length;
          if (items > 0) {
            pageData = response.data;
            break;
          }
        } catch (e) {
          // Continue trying other URL patterns
        }
      }
      
      if (!pageData && pageNum === 1) {
        try {
          response = await axios.get('https://poprace.net/en/category.php', {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          pageData = response.data;
        } catch (e) {
          console.error('❌ Error scraping Pop Race base URL');
          break;
        }
      }
      
      if (!pageData) break;
      
      const $ = cheerio.load(pageData);
      const pageItems = $('a.image-text__link');
      
      if (pageItems.length === 0) break;
      
      pageItems.each((_, el) => {
        const link = $(el);
        
        const imgWrapper = link.find('.image-text__img-wrapper');
        const styleAttr = imgWrapper.attr('style') || '';
        const photoMatch = styleAttr.match(/url\(['"]?\.\.\/([^'"]+)['"]?\)/);
        const photo = photoMatch ? `https://poprace.net/${photoMatch[1]}` : '';
        
        const titleElement = link.find('.image-text__title');
        let name = titleElement.text().trim();
        name = name.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ');
        
        const copyElement = link.find('.image-text__copy');
        const copyText = copyElement.text().trim();
        const skuMatch = copyText.match(/(PR\d{6})/);
        const code = skuMatch ? skuMatch[0] : '';
        
        if (name && name.length > 3 && code) {
          if (!cars.find(c => c.toy_num === code)) {
            cars.push({
              toy_num: code,
              carModel: name,
              series: 'Pop Race',
              brand: 'Pop Race',
              photo_url: photo || '',
              year: new Date().getFullYear().toString(),
            });
            foundItems++;
          }
        }
      });
      
      if (foundItems >= 200 || pageItems.length < 20) break;
      pageNum++;
      
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));
    }

    console.log(`✅ Found ${cars.length} Pop Race items.`);
    return cars;
  } catch (error) {
    console.error('❌ Error scraping Pop Race:', error);
    return [];
  }
}

async function scrapeKaidoHouse() {
  console.log('🚀 Starting Kaido House Scrape...');
  const cars: any[] = [];
  
  try {
    // Kaido House might have multiple collections - try different collections
    const collections = [
      'diecast',
      'diecast-models',
      'gt-models',
      'vehicles',
      'collectibles',
    ];
    
    for (const collection of collections) {
      let pageNum = 1;
      let maxPages = 25; // Safety limit
      let pageHasItems = true;
      
      while (pageNum <= maxPages && pageHasItems) {
        const baseUrl = `https://www.kaidohouse.com/collections/${collection}?page=${pageNum}`;
        console.log(`📄 Scraping Kaido House ${collection} page ${pageNum}...`);
        
        let response: any;
        try {
          response = await axios.get(baseUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
        } catch (e) {
          // Try without page parameter for first page
          if (pageNum === 1) {
            try {
              response = await axios.get(`https://www.kaidohouse.com/collections/${collection}`, {
                timeout: 10000,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
              });
            } catch (e2) {
              console.log(`⏭️ Skipping collection: ${collection}`);
              break;
            }
          } else {
            break;
          }
        }
        
        const $ = cheerio.load(response.data);
        
        // Kaido House uses various product card structures
        // Try multiple selectors
        const productSelectors = [
          'a[href*="/products/"]',
          'div[class*="ProductCard"] a',
          'li[class*="product"] a',
          'div.product-item a',
        ];
        
        let itemsFound = 0;
        
        for (const selector of productSelectors) {
          $(selector).each((_, el) => {
            const link = $(el);
            const href = link.attr('href') || '';
            
            // Skip non-product links
            if (!href.includes('/products/')) return;
            
            // Get the product card parent for image
            const card = link.closest('[class*="card"], [class*="product"]');
            
            // Extract name from link aria-label, alt text, or text content
            let name = link.attr('aria-label') || link.attr('title') || link.text().trim() || '';
            if (name.includes('\n')) name = name.split('\n')[0].trim();
            name = name.trim();
            
            // Extract image
            let photo = '';
            let imgEl = link.find('img').first();
            if (!imgEl.length) imgEl = card.find('img').first();
            
            if (imgEl.length > 0) {
              photo = imgEl.attr('src') || imgEl.attr('data-src') || '';
            }
            
            // Extract SKU from URL or name pattern
            const urlMatch = href.match(/\/(products|items)\/([a-z0-9-]+)/i);
            let code = '';
            
            // Try to extract KHMG code from name
            const khmgMatch = name.match(/(KHMG\d+|KH\d+)/i);
            if (khmgMatch) {
              code = khmgMatch[0];
            } else if (urlMatch) {
              code = `KH-${urlMatch[2].replace(/-/g, '').toUpperCase().substring(0, 12)}`;
            } else {
              // Fallback: use name hash
              code = `KH-${Buffer.from(name).toString('hex').substring(0, 8).toUpperCase()}`;
            }
            
            if (name && name.length > 3 && code) {
              // Ensure photo URL is complete
              if (photo) {
                if (!photo.startsWith('http')) {
                  if (photo.startsWith('/')) {
                    photo = `https://www.kaidohouse.com${photo}`;
                  } else {
                    photo = `https://www.kaidohouse.com/${photo}`;
                  }
                }
                // Fix common CDN URLs
                if (photo.includes('cdn.shopify.com')) {
                  // Already complete
                }
              }
              
              // Avoid duplicates
              if (!cars.find(c => c.toy_num === code && c.carModel === name)) {
                cars.push({
                  toy_num: code,
                  carModel: name,
                  series: 'Kaido House Collection',
                  brand: 'Kaido House',
                  photo_url: photo || '',
                  year: new Date().getFullYear().toString(),
                });
                itemsFound++;
              }
            }
          });
          
          if (itemsFound > 0) break; // Found items with this selector
        }
        
        pageHasItems = itemsFound > 0;
        pageNum++;
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`✅ Found ${cars.length} Kaido House items (from multiple collections/pages).`);
    return cars;
  } catch (error) {
    console.error('❌ Error scraping Kaido House:', error);
    return [];
  }
}

async function scrapeTomica() {
  console.log('🚀 Starting Tomica Scrape (Takara Tomy)...');
  const cars: any[] = [];
  
  try {
    // Tomica global catalog (English site)
    const baseUrl = 'https://www.takaratomy.com/tomica/';
    
    try {
      const response = await axios.get(baseUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      let itemsFound = 0;
      
      // Tomica product selectors - try multiple patterns
      $('a[href*="tomica"], [class*="product"] a, li[class*="item"] a').each((_, el) => {
        const link = $(el);
        const href = link.attr('href') || '';
        const name = link.text().trim() || link.attr('title') || link.attr('aria-label') || '';
        
        if (!href || !name || href.length < 5) return;
        if (href.includes('javascript:')) return;
        
        // Look for parent card for image
        const card = link.closest('[class*="card"], [class*="product"], li');
        let photo = '';
        
        const imgEl = card.find('img').first();
        if (imgEl.length > 0) {
          photo = imgEl.attr('src') || imgEl.attr('data-src') || '';
        }
        
        // Create code from name or URL
        const nameMatch = name.match(/(\d{3,4})/);
        const codeFromUrl = href.match(/\/([a-z0-9-]{5,})\/?$/i);
        let code = '';
        
        if (nameMatch) {
          code = `TOMICA-${nameMatch[1]}`;
        } else if (codeFromUrl) {
          code = `TOMICA-${codeFromUrl[1].replace(/-/g, '').substring(0, 12).toUpperCase()}`;
        } else {
          code = `TOMICA-${Buffer.from(name).toString('hex').substring(0, 8).toUpperCase()}`;
        }
        
        if (name && name.length > 2 && code) {
          // Fix photo URLs
          if (photo && !photo.startsWith('http')) {
            if (photo.startsWith('/')) {
              photo = `https://www.takaratomy.com${photo}`;
            }
          }
          
          // Avoid duplicates
          if (!cars.find(c => c.toy_num === code)) {
            cars.push({
              toy_num: code,
              carModel: name,
              series: 'Tomica Global',
              brand: 'Tomica',
              photo_url: photo || '',
              year: new Date().getFullYear().toString(),
            });
            itemsFound++;
          }
        }
      });
      
    } catch (error: any) {
      // Takaratomy site might not have REST API, try alternative source
      try {
        const altUrl = 'https://tomica.takaratomy.co.jp/products/';
        const response = await axios.get(altUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        
        const $ = cheerio.load(response.data);
        $('a[href*="product"], [class*="tomica"] a').each((_, el) => {
          const link = $(el);
          const href = link.attr('href') || '';
          const name = link.text().trim() || '';
          
          if (!href || !name || name.length < 2) return;
          
          const code = `TOMICA-${Buffer.from(name).toString('hex').substring(0, 8).toUpperCase()}`;
          
          if (!cars.find(c => c.toy_num === code)) {
            cars.push({
              toy_num: code,
              carModel: name,
              series: 'Tomica',
              brand: 'Tomica',
              photo_url: '',
              year: new Date().getFullYear().toString(),
            });
          }
        });
      } catch (e) {
        // Silently continue if both sources fail
      }
    }
    
    console.log(`✅ Found ${cars.length} Tomica items.`);
    return cars;
  } catch (error) {
    console.error('❌ Error scraping Tomica:', error);
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
    
    // 4. Scrape Tomica
    console.log('');
    const tomicaCars = await scrapeTomica();
    if (tomicaCars.length > 0) {
      allCars.push(...tomicaCars);
    }

    
    // 5. Merge all into catalog
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
