"""
Merge user's series list with auto-discovered series.
Handles parenthetical sub-items like 'Car Culture (2-Packs • Team Transport)'
"""
import json
import re

# Load existing discovered series
with open('data/filtered-series.json') as f:
    existing = json.load(f)

existing_series = set(existing['seriesPages'])
existing_mainline = set(existing['mainlineLists'])

# ============================================================
# USER'S MAINLINE YEAR PAGES
# ============================================================
user_mainline = set()

# Simple years 1968-2009 (except 2010), 2011-2016
for y in range(1968, 2027):
    user_mainline.add(f"List of {y} Hot Wheels")

# 2010 variants
user_mainline.add("List of 2010 Hot Wheels")
user_mainline.add("List of 2010 Hot Wheels (International)")

# 2017-2026 "by Series" variants
for y in range(2017, 2027):
    user_mainline.add(f"List of {y} Hot Wheels (by Series)")

# "new castings" variants (already discovered)
for y in range(1968, 2027):
    user_mainline.add(f"List of {y} Hot Wheels new castings")

# ============================================================
# USER'S SERIES PAGES (parsed from • separated text)
# ============================================================
user_series_raw = {
    "Early Collections": [
        "Action Command", "Classics", "Classy Customs", "Drag Strippers", 
        "Extras", "Flying Colors", "Grand Prix", "HiRakers", "Megaforce",
        "Oldies But Goodies", "Real Riders", "Rescue Team", "Speed Demons",
        "Speed Fleet", "Speed Machines", "Speedway Specials", "Super Chromes",
        "Super Streeters", "The Heavies", "The Heavys", "The Hot Ones",
        "The Spoilers", "Trailbusters", "Ultra Hots", "Workhorses",
    ],
    "Early Special Series": [
        "Action Packs", "Auto-City", "Automagic", "California Custom",
        "Chopcycles", "Color Changers", "Color FX", "Convertables",
        "Crack-Ups", "Crashers", "Farbs", "Fat Daddy Sizzlers", "Flip Outs",
        "Flippers", "Gran Toros", "Hot Birds", "Hot Line", "Hot Shots",
        "Hot Wheels U.S.A.", "Hot Wheels World", "Motorized X-V Racers",
        "Night Ridin' Sizzlers", "Planet Micro", "Revvers", "RRRumblers",
        "Scorchers", "Shift Kickers", "Sizzlers", "Sizzlers II", "Small Shots",
        "Steering Rigs", "Super California Custom", "X-V Racers", "Zowees",
    ],
    "Other Early Series": [
        "Action Cycles", "Action Racers", "Attack Pack",
        "Hot Wheels Railroad", "Key Force",
    ],
    "Modern Special Series": [
        "100%", "AcceleRacers", "Auto Affinity", "Battle Force 5",
        "Boulevard", "Car Culture", "Car Culture 2-Packs", "Team Transport",
        "Character Cars", "Color Shifters", "Color Reveal",
        "Cool Classics", "Classics", "Delivery", "Dragstrip Demons",
        "Fast & Furious Premium", "Flying Customs", "Flying Customs (2006)",
        "Flying Customs (2013)", "Flying Customs (2020)",
        "Formula One Collection", "Hot Wheels Garage",
        "Hall of Fame", "High-Speed Wheels Track Stars",
        "Highway 35 World Race", "Heritage", "Hot Wheels id",
        "Hot Wheels Racing", "Mario Kart", "Nostalgic Brands",
        "Pop Culture", "Premium Collector Sets",
        "Pro Racing", "Team Transporters",
        "Replica Entertainment", "Retro Style", "Since '68",
        "Speed Machines", "Super Chromes",
        "Team Hot Wheels High-Speed Wheel",
        "The Hot Ones (2011)", "The Hot Ones (2025)",
        "Ultra Hots", "Vintage Racing",
    ],
    "Notable Modern Themed Assortments": [
        "50th Anniversary Favorites", "50th Anniversary Originals",
        "50th Anniversary Throwback",
        "Pearl and Chrome Anniversary Series",
        "Pearl and Chrome Anniversary Series (2018)",
        "Pearl and Chrome Anniversary Series (2019)",
        "Pearl and Chrome Anniversary Series (2020)",
        "Pearl and Chrome Anniversary Series (2021)",
        "Pearl and Chrome Anniversary Series (2022)",
        "Pearl and Chrome Anniversary Series (2023)",
        "Pearl and Chrome Anniversary Series (2024)",
        "Pearl and Chrome Anniversary Series (2025)",
        "Pearl and Chrome Anniversary Series (2026)",
        "Batman (2012)", "Batman (2015)", "Batman (2018)",
        "Batman (2019)", "Batman (2021)", "Batman (2022)",
        "Batman (2023)", "Batman (2024)", "Batman (2025)",
        "Cars of the Decades", "Cop Rods",
        "Easter Eggsclusives", "Easter (2013)", "Easter (2014)",
        "Easter (2015)", "Easter (2017)",
        "Fast & Furious", "Fast & Furious Spy Racers",
        "Fire Rods (2000)", "Fire Rods (2009)",
        "Fright Cars", "Halloween Cars", "Holiday Hot Rods",
        "HW Road Trippin'",
        "HW Winter (2020)", "HW Winter (2021)", "HW Winter (2022)",
        "HW Winter (2023)", "HW Winter (2024)",
        "Neon Speeders", "Retro Style",
        "Spring (2018)", "Spring (2019)", "Spring (2020)",
        "Spring (2021)", "Spring (2022)", "Spring (2023)",
        "Spring (2024)", "Spring (2025)",
        "Stars & Stripes", "The Beatles Yellow Submarine",
        "Throwback", "Ultra Hots", "Vintage Racing Club",
    ],
    "Other Modern Series": [
        "Atomix", "Battle X", "Custom Classics", "Custom Motors",
        "Dropstars", "Extreme Shoxx", "Ferrari X-V", "G-Machines",
        "Hot Import Nights", "Hot Tunerz", "Hot Wheels Haulers",
        "Hot Wheels Skate", "Lightyear", "Long Haulers", "Modifighters",
        "Monster Jam", "Monster Jam Rev Tredz",
        "Monster Trucks", "Monster Trucks Bash-Ups",
        "Monster Trucks Big Rigs", "Monster Trucks Color Reveal",
        "Monster Trucks Double Troubles", "Monster Trucks Mini",
        "Monster Trucks Mystery Trucks", "Monster Trucks Oversized",
        "Monster Trucks Roarin' Wreckers", "Monster Trucks Twisted Tredz",
        "Moto Track Stars", "Motor Cycles", "Pavement Pounders",
        "RacerVerse", "Racing Rigs", "Rapid Transit", "RC",
        "Road Beasts", "Robo Wheels", "Shogun Racers", "Skate Freaks",
        "Sky Busters", "Snap Rides", "Speed Cycles", "Speed Demons",
        "Starships", "Starships Select", "Super Rigs",
        "Thunder Cycles", "Track Fleet", "Track Stars Haulers",
        "Trackin' Trucks", "Truckin' Transporters",
        "Volkswagen", "Wrecking Wheels",
    ],
    "Exclusives": [
        "Elite 64", "HWC.com", "Red Line Club", "NFT Garage",
    ],
    "Larger Scale": [
        "1:43 Pull-Backs", "Batman 1:50 Scale Series",
        "Formula Fuelers", "Hot Wheels Elite", "Hot Wheels XL",
        "Premium 1:43", "Pull-Back Speeders", "Street Power",
        "Tunerz", "Corgi Collection", "Turbos Collection",
        "Eastwood Automobilia", "1:43 Pullbax", "1:43 Battle Vehicles",
        "LionChief", "Let's Race: Activate!",
    ],
    "Miscellaneous": [
        "Collector Numbers 1 - 1121",
        "Hot Wheels 1:87 Scale Series",
        "Multipacks",
    ],
}

# Flatten all user series
user_series = set()
for category, items in user_series_raw.items():
    for item in items:
        user_series.add(item)

# Also try wiki-style names (with "Series" suffix for some)
wiki_variants = set()
for s in user_series:
    wiki_variants.add(s)
    wiki_variants.add(f"{s} Series")
    # Handle "Hi-Rakers" vs "HiRakers"  
    if s == "HiRakers":
        wiki_variants.add("Hi-Rakers")
        wiki_variants.add("Hi-Rakers Series")

# ============================================================
# MERGE
# ============================================================
merged_mainline = sorted(existing_mainline | user_mainline)
merged_series = sorted(existing_series | user_series | wiki_variants)

# Remove obvious non-table pages
skip_patterns = [
    r'^Timeline of',
    r'^List of Sets',
    r'^Wheel types',
    r'^Sinnin',
]
merged_series = [s for s in merged_series if not any(re.match(p, s) for p in skip_patterns)]

# Stats
new_mainline = user_mainline - existing_mainline
new_series = (user_series | wiki_variants) - existing_series

print(f"Existing mainline: {len(existing_mainline)}")
print(f"User mainline: {len(user_mainline)}")
print(f"NEW mainline pages: {len(new_mainline)}")
if new_mainline:
    for p in sorted(new_mainline):
        print(f"  + {p}")

print(f"\nExisting series: {len(existing_series)}")
print(f"User series (with variants): {len(user_series | wiki_variants)}")
print(f"NEW series pages: {len(new_series)}")
for p in sorted(new_series):
    print(f"  + {p}")

print(f"\n{'='*50}")
print(f"MERGED TOTALS:")
print(f"  Mainline lists: {len(merged_mainline)}")
print(f"  Series pages: {len(merged_series)}")
print(f"  TOTAL: {len(merged_mainline) + len(merged_series)}")

# Save
output = {
    'totalFiltered': len(merged_series),
    'seriesPages': merged_series,
    'mainlineLists': merged_mainline,
    'userCategories': {cat: items for cat, items in user_series_raw.items()},
    'mergedAt': __import__('datetime').datetime.now().isoformat(),
}
with open('data/filtered-series.json', 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"\n💾 Saved to data/filtered-series.json")
