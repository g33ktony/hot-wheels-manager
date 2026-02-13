import json

data = json.load(open('data/hotwheels_database.json'))

# Check segment field
segments = {}
for c in data:
    s = c.get('segment', '')
    segments[s] = segments.get(s, 0) + 1
print('=== SEGMENT FIELD VALUES ===')
for k, v in sorted(segments.items(), key=lambda x: -x[1])[:20]:
    print(f'  [{repr(k)}]: {v}')

print()

# List all unique series
series_set = {}
for c in data:
    s = c.get('series', '')
    series_set[s] = series_set.get(s, 0) + 1
print(f'=== UNIQUE SERIES: {len(series_set)} ===')
for k, v in sorted(series_set.items(), key=lambda x: -x[1])[:80]:
    print(f'  {v:5d}  {k}')
