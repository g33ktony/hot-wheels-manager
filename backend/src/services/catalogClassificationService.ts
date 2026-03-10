/**
 * Servicio de clasificación del catálogo
 * Responsable de identificar tipos de series, colores, metadatos
 */

import type { HWSeriesType, ColorGroup, ColorVariant, Brand } from '../shared/catalog-types'

export class CatalogClassificationService {
  /**
   * Detecta el tipo de serie de Hot Wheels
   * STH: Spectraflame + mainline
   * TH: De segmentos específicos
   */
  static classifyHotWheelsSeriesType(item: any): HWSeriesType {
    const segment = (item.segment || '').toLowerCase()
    const series = (item.series || '').toLowerCase()
    const color = (item.color || '').toLowerCase()
    const year = item.year

    // STH: Spectraflame y mainline
    if (segment === 'mainline' && this.isSpectraflame(color)) {
      return 'sth'
    }

    // TH: Treasure Hunt (mainline pero no spectraflame, usualmente "treasure hunt" en series o segment)
    if (
      (segment === 'mainline' && series.includes('treasure hunt')) ||
      series.match(/treasure\s*hunt/i)
    ) {
      return 'th'
    }

    // Premium series
    if (segment === 'premium' || series.includes('premium')) {
      return 'premium'
    }

    // Team Transport
    if (series.includes('team transport') || segment === 'team-transport') {
      return 'team-transport'
    }

    // Pop Culture
    if (series.includes('pop culture') || segment === 'pop-culture') {
      return 'pop-culture'
    }

    // F1
    if (series.includes('formula 1') || series.includes('f1') || segment === 'f1') {
      return 'f1'
    }

    // Boulevard
    if (series.includes('boulevard') || segment === 'boulevard') {
      return 'boulevard'
    }

    // The Hot Ones
    if (series.includes('the hot ones') || segment === 'the-hot-ones') {
      return 'the-hot-ones'
    }

    // RaceVerse
    if (series.includes('raceverse') || segment === 'raceverse') {
      return 'raceverse'
    }

    // Acceleracers
    if (series.includes('acceleracers') || segment === 'acceleracers') {
      return 'acceleracers'
    }

    // Chase Silver Series
    if (series.includes('chase') && series.includes('silver') || segment === 'chase-silver-series') {
      return 'chase-silver-series'
    }

    // Default mainline
    if (segment === 'mainline') {
      return 'mainline'
    }

    return 'unknown'
  }

  /**
   * Detecta si un color es Spectraflame
   */
  private static isSpectraflame(color: string): boolean {
    const spectroKeywords = [
      'spectraflame',
      'spectro',
      'pearl',
      'iridescent',
      'color shifter',
      'metallic',
    ]
    return spectroKeywords.some(kw => color.toLowerCase().includes(kw))
  }

  /**
   * Normaliza y agrupa colores
   */
  static normalizeColor(color: string): { group: ColorGroup; variant: ColorVariant; hex?: string } {
    if (!color || !color.trim()) {
      return { group: 'Unknown', variant: 'Standard' }
    }

    const normalized = color.toLowerCase()

    // Detectar variante
    let variant: ColorVariant = 'Standard'
    if (normalized.includes('metallic')) variant = 'Metallic'
    else if (normalized.includes('pearl')) variant = 'Pearl'
    else if (normalized.includes('spectraflame')) variant = 'Spectraflame'
    else if (normalized.includes('matte')) variant = 'Matte'
    else if (normalized.includes('glitter')) variant = 'Glitter'

    // Mapear a grupo de color
    const colorGroups = {
      Red: [
        'red',
        'crimson',
        'scarlet',
        'maroon',
        'burgundy',
        'dark red',
        'cherry',
        'fire',
      ],
      Blue: [
        'blue',
        'navy',
        'cobalt',
        'cyan',
        'azure',
        'steel blue',
        'dark blue',
        'light blue',
        'royal blue',
      ],
      Green: ['green', 'lime', 'olive', 'dark green', 'light green', 'forest', 'sage'],
      Yellow: ['yellow', 'gold', 'tan', 'cream', 'beige', 'khaki'],
      Orange: ['orange', 'coral', 'peach', 'apricot'],
      Purple: ['purple', 'violet', 'magenta', 'plum', 'lavender'],
      Pink: ['pink', 'rose', 'hot pink', 'fuchsia'],
      Black: ['black', 'ebony', 'obsidian', 'jet'],
      White: ['white', 'pearl white', 'ivory', 'cream'],
      Silver: ['silver', 'grey', 'gray', 'chrome', 'gunmetal', 'metallic gray'],
      Brown: ['brown', 'tan', 'bronze', 'copper', 'rust'],
      Gray: ['gray', 'grey', 'ash', 'slate', 'charcoal'],
      Chrome: ['chrome', 'chrome plated', 'plated'],
      Multi: ['multi', 'mix', 'splatter', 'two-tone', 'tri-color', 'rainbow', 'gradient'],
    }

    for (const [group, keywords] of Object.entries(colorGroups)) {
      if (keywords.some(kw => normalized.includes(kw))) {
        return {
          group: group as ColorGroup,
          variant,
          hex: this.colorToHex(group as ColorGroup),
        }
      }
    }

    return { group: 'Unknown', variant, hex: '#999999' }
  }

  /**
   * Convierte nombre de grupo a hex aproximado
   */
  private static colorToHex(group: ColorGroup): string {
    const hexMap: Record<ColorGroup, string> = {
      Red: '#C41E3A',
      Blue: '#0066FF',
      Green: '#228B22',
      Yellow: '#FFD700',
      Orange: '#FF8C00',
      Purple: '#800080',
      Pink: '#FF69B4',
      Black: '#000000',
      White: '#FFFFFF',
      Silver: '#C0C0C0',
      Gold: '#FFD700',
      Brown: '#8B4513',
      Gray: '#808080',
      Chrome: '#E8E8E8',
      Multi: '#FF00FF',
      Unknown: '#999999',
    }
    return hexMap[group] || '#999999'
  }

  /**
   * Genera posición en serie (ej: "4/5" o "245/250")
   */
  static extractSeriesPosition(item: any): string | undefined {
    const seriesNum = (item.series_num || '').trim()
    if (!seriesNum) return undefined
    // Trata de extraer formato X/Y - limpia caracteres especiales
    const match = seriesNum.match(/(\d+)\s*\/\s*(\d+)/)
    return match ? `${match[1]}/${match[2]}` : undefined
  }

  /**
   * Extrae posición en año (para mainline)
   */
  static extractYearPosition(item: any): string | undefined {
    // Formato esperado: "245/250" para mainline
    // Por ahora solo retorna si está en series_num
    return this.extractSeriesPosition(item)
  }

  /**
   * Detecta marca del item
   */
  static detectBrand(item: any): Brand {
    const brand = (item.brand || '').toLowerCase()
    const series = (item.series || '').toLowerCase()
    const toyNum = (item.toy_num || '').toLowerCase()

    // Hot Wheels
    if (brand.includes('hot wheels') || series.includes('hot wheels')) return 'Hot Wheels'

    // Mini GT
    if (brand.includes('mini gt') || toyNum.includes('mini-gt')) return 'Mini GT'

    // Pop Race
    if (brand.includes('pop race') || toyNum.includes('pop-race')) return 'Pop Race'

    // Kaido House
    if (brand.includes('kaido')) return 'Kaido House'

    // Tomica
    if (brand.includes('tomica')) return 'Tomica'

    // Default
    return 'Hot Wheels'
  }

  /**
   * Valida que carded photo sea del mismo modelo
   * Compara nombre del modelo normalizado
   */
  static validateCardedMatchesMain(mainItem: any, cardedFileName: string): boolean {
    if (!cardedFileName || !mainItem.carModel) return false

    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/\s*\([^)]*\)\s*/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()

    const mainNorm = normalize(mainItem.carModel)
    const cardedNorm = normalize(cardedFileName)

    // Verifica si la foto carded contiene los tokens principales del modelo
    const mainTokens = mainNorm.split(/\s+/)
    const matchedTokens = mainTokens.filter(token => cardedNorm.includes(token))

    // Debe coincidir al menos 60% de los tokens principales
    return matchedTokens.length / mainTokens.length >= 0.6
  }
}
