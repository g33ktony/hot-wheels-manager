/**
 * Returns the correct placeholder logo based on the BRAND, not series.
 * This ensures all cars from the same brand get their brand logo.
 * 
 * For premium brands (Mini GT, Pop Race, Kaido House, Tomica), shows brand logo
 * For Hot Wheels, uses the original series-based logic
 */

// SVG logos as data URIs
const BRAND_LOGOS = {
  'mini gt': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkYzMzMzIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQ4IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5NSU5JIEdUPC90ZXh0Pgo8L3N2Zz4=',
  'pop race': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkZCODAwIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjM2IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iYmxhY2siIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5QT1AgUkFDRTwvdGV4dD4KPC9zdmc+',
  'kaido house': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjMyIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iI0ZGRDcwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPktBSURPPC90ZXh0Pgo8L3N2Zz4=',
  'tomica': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMDA3NEYxIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjQ0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5UT01JQ0E8L3RleHQ+Cjwvc3ZnPg==',
}

export function getPlaceholderLogo(seriesOrBrand?: string, brand?: string): string {
  // New behavior: if brand is specified, use brand logo
  if (brand) {
    const brandLower = brand.toLowerCase()
    if (brandLower === 'mini gt') return BRAND_LOGOS['mini gt']
    if (brandLower === 'pop race') return BRAND_LOGOS['pop race']
    if (brandLower === 'kaido house') return BRAND_LOGOS['kaido house']
    if (brandLower === 'tomica') return BRAND_LOGOS['tomica']
    // Hot Wheels falls through to series-based logic below
  }

  // Legacy: series-based logic for Hot Wheels only
  if (!seriesOrBrand) return '/hw-flame-black.png'

  const s = seriesOrBrand.toLowerCase()
  if (s.includes('elite 64') || s.includes('elite64')) {
    return '/hw-elite64.png'
  }

  if (
    s.includes('red line club') ||
    s.includes('redline club') ||
    s.includes('rlc ') ||
    s === 'rlc' ||
    s.startsWith('rlc ')
  ) {
    return '/hw-rlc.png'
  }

  // Mainline / basic series → black flame
  if (
    s.includes('mainline') ||
    s.startsWith('hw ') ||
    s.startsWith('hot wheels ') ||
    s.includes('then and now') ||
    s.includes('muscle mania') ||
    s.includes('hw turbo') ||
    s.includes('hw hot trucks') ||
    s.includes('hw green speed') ||
    s.includes('hw drag strip') ||
    s.includes('hw exotics') ||
    s.includes('hw dream garage') ||
    s.includes('hw art cars') ||
    s.includes('hw rescue') ||
    s.includes('hw sport') ||
    s.includes('hw race') ||
    s.includes('hw city') ||
    s.includes('hw off-road') ||
    s.includes('hw workshop') ||
    s.includes('hw screen') ||
    s.includes('hw j-imports') ||
    s.includes('hw compact kings') ||
    s.includes('hw roadsters') ||
    s.includes('hw tooned') ||
    s.includes('hw flames') ||
    s.includes('hw metro') ||
    s.includes('hw daredevils') ||
    s.includes('hw contoured') ||
    s.includes('hw modified') ||
    s.includes('hw track champs') ||
    s.includes('hw gassers') ||
    s.includes('hw wagons') ||
    s.includes('hw climate crew') ||
    s.includes('hw snow stormerz') ||
    s.includes('hw exposed engines') ||
    s.includes('hw factory fresh') ||
    s.includes('hw fast foodie') ||
    s.includes('hw electro silhouette') ||
    s.includes('hw battler') ||
    s.includes('hw brick rides') ||
    s.includes('hw die-cast') ||
    s.includes('hw baja blazers') ||
    s.includes('crew choice') ||
    s.includes('experimotors') ||
    s.includes('nightburnerz') ||
    s.includes('street beast') ||
    s.includes('dino rides') ||
    s.includes('x-raycers') ||
    s.includes('checkmate') ||
    s.includes('super chromes') ||
    s.includes('holiday racers') ||
    s.includes('digital circuit') ||
    s.includes('first editions') ||
    s.includes('new models') ||
    s.includes('track stars') ||
    s.includes('treasure hunt')
  ) {
    return '/hw-flame-black.png'
  }

  return '/hw-flame-black.png'
}

/** Default placeholder for contexts without series info */
export const DEFAULT_PLACEHOLDER = '/hw-flame-black.png'
