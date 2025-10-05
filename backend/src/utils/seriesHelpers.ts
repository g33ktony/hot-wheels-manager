/**
 * Series Helpers - Utilities for series pricing and validation
 */

/**
 * Calculate default series price (85% of individual total)
 * @param individualPrice - Price of a single piece
 * @param seriesSize - Total number of pieces in the series
 * @returns Calculated series price (85% of total)
 */
export const calculateDefaultSeriesPrice = (individualPrice: number, seriesSize: number): number => {
  const totalIndividualPrice = individualPrice * seriesSize
  return Math.round(totalIndividualPrice * 0.85 * 100) / 100 // 85% discount, rounded to 2 decimals
}

/**
 * Calculate price per piece when sold as series
 * @param seriesPrice - Total price for the complete series
 * @param seriesSize - Total number of pieces in the series
 * @returns Price per piece
 */
export const calculatePricePerPiece = (seriesPrice: number, seriesSize: number): number => {
  return Math.round((seriesPrice / seriesSize) * 100) / 100 // Rounded to 2 decimals
}

/**
 * Validate that all pieces in a series have similar base prices
 * @param prices - Array of individual prices
 * @param tolerance - Percentage tolerance (default 10%)
 * @returns Object with validation result and message
 */
export const validateSimilarPrices = (
  prices: number[], 
  tolerance: number = 0.1
): { valid: boolean; message?: string } => {
  if (prices.length === 0) {
    return { valid: false, message: 'No prices provided' }
  }

  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length
  const minAllowed = avgPrice * (1 - tolerance)
  const maxAllowed = avgPrice * (1 + tolerance)

  const outliers = prices.filter(p => p < minAllowed || p > maxAllowed)

  if (outliers.length > 0) {
    return { 
      valid: false, 
      message: `Algunos precios están fuera del rango permitido (±${tolerance * 100}% del promedio: $${avgPrice.toFixed(2)})` 
    }
  }

  return { valid: true }
}
