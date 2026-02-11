import json

d = json.load(open('data/discovered-series.json'))
series = d['allSeries']

series_pages = []
individual_cars = []

for s in series:
    lower = s.lower()
    is_series = ('series' in lower or 'mini collection' in lower or 
                 lower.startswith('list of') or lower.startswith('list of'))
    is_car = any(x in lower for x in [
        '(monster truck)', '(monster jam', '(themed monster', '(big rigs)',
        '(oversized)', '(100%)', "(mcdonald", '(attack pack)', '(smack pack)',
        '(disambiguation)', '(elite 64)', '(rlc)', '(id)', '(track stars haulers)',
    ])
    
    if is_car:
        individual_cars.append(s)
    elif is_series:
        series_pages.append(s)

mainline_lists = [s for s in series if s.startswith('List of') and 'Hot Wheels' in s]
ambiguous = [s for s in series if s not in series_pages and s not in individual_cars]

print(f'Total discovered: {len(series)}')
print(f'Clear series pages: {len(series_pages)}')
print(f'Individual car pages: {len(individual_cars)}')
print(f'Ambiguous: {len(ambiguous)}')
print()

# Known series without "Series" in name
known_series_patterns = [
    'Car Culture', 'Pop Culture', 'Team Transport', 'Hot Wheels Boulevard',
    'Hot Wheels Classics', 'Hot Wheels Premium', 'Hot Wheels id',
    'Hot Wheels Heritage', 'Hot Wheels Garage', 'AcceleRacers', 'Highway 35',
    'Speed Machines', 'Experimotors', 'Nightburnerz', 'Muscle Mania',
    'Then and Now', 'Tooned', 'Factory Fresh', 'Rod Squad', 'Super Chromes',
    'All Stars', 'Code Cars', 'Compact Kings', 'Dino Riders', 'Track Stars',
    'Sky Busters', 'Red Line Club', 'Elite 64', 'Treasure Hunts', 'Super Treasure Hunt',
    'Real Riders', 'Track Aces', 'New Models', 'Baja Blazers',
    'Night Burnerz', 'Chrome Burnerz', 'Classy Customs', 'Wastelanders',
    'Marvel Character Cars', 'Star Wars Character Cars', 'Star Wars Carships',
    'Star Wars Starships', 'Pride Rides', 'X-Raycers', 'Pure Muscle',
    'Pro Circuit', 'Mattel Creations',
]

extra_from_ambiguous = []
for s in ambiguous:
    for pat in known_series_patterns:
        if pat.lower() in s.lower():
            extra_from_ambiguous.append(s)
            break

# Combine all series
all_series = sorted(set(series_pages + extra_from_ambiguous))

print(f'Series pages (with known patterns): {len(all_series)}')
print()
for s in sorted(all_series):
    print(f'  {s}')

# Save filtered list
output = {
    'totalFiltered': len(all_series),
    'seriesPages': sorted(all_series),
    'mainlineLists': sorted(set(mainline_lists)),
    'individualCars': len(individual_cars),
    'ambiguous': len(ambiguous),
}
json.dump(output, open('data/filtered-series.json', 'w'), indent=2)
print(f'\nSaved to data/filtered-series.json')
