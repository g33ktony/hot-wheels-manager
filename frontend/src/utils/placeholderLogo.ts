/**
 * Returns the correct Hot Wheels placeholder logo based on the series name.
 * 
 * - Elite 64 series → Elite 64 badge
 * - Red Line Club (RLC) series → RLC badge
 * - Mainline / basic series → Black flame logo
 * - Everything else (STH, premium, etc.) → Gold flame logo (default)
 */
export function getPlaceholderLogo(series?: string): string {
  if (!series) return '/hw-flame-black.png'

  const s = series.toLowerCase()

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
