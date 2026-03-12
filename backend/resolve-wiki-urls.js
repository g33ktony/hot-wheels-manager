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
    // Also check carded
    if (item.photo_url_carded && item.photo_url_carded.startsWith('wiki-file:')) {
        // Will handle later
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
                catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function resolveBatch(fileNames) {
    // Fandom API supports up to 50 titles per request
    const titles = fileNames.map(f => 'File:' + f).join('|');
    const url = `https://hotwheels.fandom.com/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=imageinfo&iiprop=url&format=json`;

    const result = await fetchJson(url);
    const resolved = new Map();

    if (result && result.query && result.query.pages) {
        for (const [pageId, page] of Object.entries(result.query.pages)) {
            if (page.imageinfo && page.imageinfo[0] && page.imageinfo[0].url) {
                // Extract just the filename from the title (remove "File:" prefix)
                const originalTitle = page.title.replace('File:', '');
                resolved.set(originalTitle, page.imageinfo[0].url);
            }
        }
    }

    return resolved;
}

async function main() {
    const BATCH_SIZE = 50;
    let resolvedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < wikiFileItems.length; i += BATCH_SIZE) {
        const batch = wikiFileItems.slice(i, i + BATCH_SIZE);
        const fileNames = batch.map(b => b.fileName);

        try {
            const resolved = await resolveBatch(fileNames);

            for (const item of batch) {
                const cdnUrl = resolved.get(item.fileName);
                if (cdnUrl) {
                    data[item.idx].photo_url = cdnUrl;
                    resolvedCount++;
                } else {
                    failedCount++;
                }
            }
        } catch (err) {
            console.error(`Batch ${i}-${i + BATCH_SIZE} failed:`, err.message);
            failedCount += batch.length;
        }

        // Rate limiting - 100ms between batches
        await new Promise(r => setTimeout(r, 100));

        if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= wikiFileItems.length) {
            console.log(`Progress: ${Math.min(i + BATCH_SIZE, wikiFileItems.length)}/${wikiFileItems.length} (resolved: ${resolvedCount}, failed: ${failedCount})`);
        }
    }

    console.log(`\nDone! Resolved: ${resolvedCount}, Failed: ${failedCount}`);

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
