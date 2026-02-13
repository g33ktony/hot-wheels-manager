import json

data = json.load(open('data/hotwheels_database.json'))
total = len(data)
has_photo = sum(1 for c in data if c.get('photo_url') and c['photo_url'].strip())
has_wiki = sum(1 for c in data if c.get('photo_url','').startswith('wiki-file:'))
has_http = sum(1 for c in data if c.get('photo_url','').startswith('http'))
has_static = sum(1 for c in data if 'static.wikia' in c.get('photo_url',''))
has_carded = sum(1 for c in data if c.get('photo_url_carded') and c['photo_url_carded'].strip())
no_photo = total - has_photo

print(f'Total items: {total}')
print(f'With photo_url: {has_photo} ({100*has_photo/total:.1f}%)')
print(f'  - wiki-file: refs: {has_wiki}')
print(f'  - http URLs: {has_http}')
print(f'  - static.wikia: {has_static}')
print(f'Without photo_url: {no_photo} ({100*no_photo/total:.1f}%)')
print(f'With photo_url_carded: {has_carded}')
print()

# Sample wiki-file refs
wf = [c for c in data if c.get('photo_url','').startswith('wiki-file:')][:5]
for c in wf:
    print(f'  wiki-file: {c.get("carModel","")} -> {c["photo_url"][:80]}')

print()

# Sample no-photo items
nop = [c for c in data if not c.get('photo_url') or not c['photo_url'].strip()][:10]
for c in nop:
    print(f'  NO PHOTO: {c.get("carModel","")} | series={c.get("series","")} | year={c.get("year","")}')

print()

# Check what photo_url values look like for non-wiki-file, non-http
other = [c for c in data if c.get('photo_url') and c['photo_url'].strip() and not c['photo_url'].startswith('wiki-file:') and not c['photo_url'].startswith('http')][:10]
print(f'Other photo_url patterns: {len(other)}')
for c in other:
    print(f'  OTHER: {c["photo_url"][:100]}')
