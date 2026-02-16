const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
    const r = await axios.get('https://poprace.net/en/category.php');
    const $ = cheerio.load(r.data);

    console.log('Total image-text__link elements:', $('a.image-text__link').length);

    // Count total a tags
    console.log('Total a tags:', $('a').length);

    // Try to find all product links
    const productLinks = $('a[href*="ProductDetail"]');
    console.log('ProductDetail links:', productLinks.length);

    console.log('\n=== First 5 links ===');
    productLinks.slice(0, 5).each((i, el) => {
        const link = $(el);
        const href = link.attr('href');
        const text = link.text().substring(0, 80);
        const parent = link.parent().parent();
        const bgImg = parent.find('[style*="background-image"]');

        console.log(`\n[${i + 1}] ${href}`);
        console.log(`  Text: ${text}`);
        console.log(`  BgImg elements found: ${bgImg.length}`);
    });
})();
