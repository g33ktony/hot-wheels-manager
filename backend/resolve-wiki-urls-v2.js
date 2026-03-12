const fs = require('fs');
const path = require('path');
const https = require('https');

const dbPath = path.join(__dirname, 'data/hotwheels_database.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Collect all wiki-file: URLs that need resolving
const wikiFileItems = [];
data.forEach((item, idx) => {
    if (item.photo_url && item.photo_url.startsWith('wiki-file:')) {
        wikiFileItems.push({ idx, fileName: item.photo_url.replace('wiki-file:', '').trim() });
    }
});

console.log(`Found ${wikiFileItems.length} wiki-file: URLs to resolve`);

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'HotWheelsManager/1.0' } }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); }
                catch (e) { reject(new Error('JSON parse error: ' + body.substring(0, 200))); }
            });
        }).on('error', reject);
    });
}

async function resolveBatch(items) {
    // Fandom API supports up to 50 titles per request
    const titles = items.map(i => 'File:' + i.fileName).join('|');
    const url = `https://hotwheels.fandom.com/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&format=json`;

    const result = await fetchJson(url);
    const resolved = new Map(); // Map<normalized_title_no_prefix, cdnUrl>

    if (result && result.query && result.query.pages) {
        for (const [pageId, page] of Object.entries(result.query.pages)) {
            if (page.imageinfo && page.imageinfo[0] && page.imageinfo[0].url) {
                // Use the title from the API (normalized, with spaces)
                const normalizedTitle = page.title.replace('File:', '');
                resolved.set(normalizedTitle, page.imageinfo[0].url);
            }
        }
    }

    // Now match back to our items
    // Fandom normalizes underscores to spaces, so we need to compare both ways
    const results = new Map();
    for (const item of items) {
        // Try exact match
        let cdnUrl = resolved.get(item.fileName);
        if (cdnUrl) {
            results.set(item.idx, cdnUrl);
            continue;
        }
        // Try with underscores -> spaces
        cdnUrl = resolved.get(item.fileName.replace(/_/g, ' '));
        if (cdnUrl) {
            results.set(item.idx, cdnUrl);
            continue;
        }
        // Try with spaces -> underscores  
        cdnUrl = resolved.get(item.fileName.replace(/ /g, '_'));
        if (cdnUrl) {
            results.set(item.idx, cdnUrl);
            continue;
        }
    }

    return results;
}

async function main() {
    const BATCH_SIZE = 50;
    let resolvedCount = 0;
    let failedCount = 0;
    const failedNames = [];

    for (let i = 0; i < wikiFileItems.length; i += BATCH_SIZE) {
        const batch = wikiFileItems.slice(i, i + BATCH_SIZE);

        try {
            const resolved = await resolveBatch(batch);

            for (const item of batch) {
                const cdnUrl = resolved.get(item.idx);
                if (cdnUrl) {
                    data[item.idx].photo_url = cdnUrl;
                    resolvedCount++;
                } else {
                    failedCount++;
                    if (failedNames.length < 20) failedNames.push(item.fileName);
                }
            }
        } catch (err) {
            console.error(`Batch ${i}-${i + BATCH_SIZE} failed:`, err.message);
            failedCount += batch.length;
        }

        // Rate limiting
        await new Promise(r => setTimeout(r, 150));

        if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= wikiFileItems.length) {
            console.log(`Progress: ${Math.min(i + BATCH_SIZE, wikiFileItems.length)}/${wikiFileItems.length} (resolved: ${resolvedCount}, failed: ${failedCount})`);
        }
    }

    console.log(`\nDone! Resolved: ${resolvedCount}, Failed: ${failedCount}`);
    if (failedNames.length > 0) {
        console.log('Sample failures:', failedNames.slice(0, 10));
    }

    // Final stats
    const hasPhoto = data.filter(x => x.photo_url && x.photo_url.length > 0).length;
    const httpsCount = data.filter(x => x.photo_url && x.photo_url.startsWith('https://')).length;
    const wikiFile = data.filter(x => x.photo_url && x.photo_url.startsWith('wiki-file:')).length;
    console.log('Final stats:', { total: data.length, hasPhoto, httpsCount, wikiFile });

    // Save
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    console.log('Saved!');
}

main().catch(console.error);
