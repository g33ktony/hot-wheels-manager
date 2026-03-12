const fs = require('fs');
const path = require('path');

const currentPath = path.join(__dirname, 'data/hotwheels_database.json');
const backupPath = path.join(__dirname, 'data/backups/hotwheels_database.before-image-reset.20260306-140100.json');

console.log('Loading current database...');
const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
console.log('Loading backup database...');
const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

// Build lookup from backup by toy_num
const backupMap = new Map();
backup.forEach(item => {
    if (item.toy_num) backupMap.set(item.toy_num, item);
});

let restored = 0;
let alreadyHttp = 0;
let kept = 0;
let noMatch = 0;
let cardedRestored = 0;
let galleryRestored = 0;

current.forEach(item => {
    const bk = backupMap.get(item.toy_num);
    if (bk === undefined) { noMatch++; return; }

    // Restore photo_url: prefer localhost uploads, then backup https, then keep wiki-file
    if (item.photo_url && item.photo_url.startsWith('http://localhost')) {
        kept++; // Keep locally uploaded photos
    } else if (bk.photo_url && bk.photo_url.startsWith('https://')) {
        item.photo_url = bk.photo_url;
        restored++;
    } else if (bk.photo_url && (item.photo_url === '' || item.photo_url === undefined || item.photo_url === null)) {
        item.photo_url = bk.photo_url;
        restored++;
    } else {
        alreadyHttp++;
    }

    // Restore photo_url_carded
    if ((item.photo_url_carded === '' || item.photo_url_carded === undefined) && bk.photo_url_carded) {
        item.photo_url_carded = bk.photo_url_carded;
        cardedRestored++;
    }

    // Restore photo_gallery
    if ((item.photo_gallery === undefined || item.photo_gallery === null || item.photo_gallery.length === 0) && bk.photo_gallery && bk.photo_gallery.length > 0) {
        item.photo_gallery = bk.photo_gallery;
        galleryRestored++;
    }
});

console.log({ restored, alreadyHttp, kept, noMatch, cardedRestored, galleryRestored });

// Verify counts after
const hasPhoto = current.filter(x => x.photo_url && x.photo_url.length > 0).length;
const httpsCount = current.filter(x => x.photo_url && x.photo_url.startsWith('https://')).length;
const wikiFile = current.filter(x => x.photo_url && x.photo_url.startsWith('wiki-file:')).length;
const localhost = current.filter(x => x.photo_url && x.photo_url.startsWith('http://localhost')).length;
console.log('After merge:', { total: current.length, hasPhoto, httpsCount, wikiFile, localhost });

// Write back
fs.writeFileSync(currentPath, JSON.stringify(current, null, 2));
console.log('Saved successfully!');
