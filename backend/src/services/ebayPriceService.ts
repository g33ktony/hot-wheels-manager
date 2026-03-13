/**
 * eBay Price Service
 *
 * Fetches average sold prices for Hot Wheels items using eBay's Browse API.
 *
 * Prerequisites:
 *   1. Register at https://developer.ebay.com (free)
 *   2. Create an application → get Client ID + Client Secret
 *   3. Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET in .env
 *
 * The service uses the OAuth Client Credentials flow (Application token)
 * to call the Browse API `item_summary/search` endpoint filtered to
 * sold/completed items in the "Diecast & Toy Vehicles" category.
 *
 * Usage:
 *   import { EbayPriceService } from './ebayPriceService'
 *   const price = await EbayPriceService.getAveragePrice('GTD48') // by toy_num
 *   const prices = await EbayPriceService.getAveragePrices(['GTD48', 'HKH29'])
 */

import axios from 'axios'

// ─── Configuration ───────────────────────────────────────────────

const EBAY_AUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token'
const EBAY_BROWSE_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search'

// Diecast & Toy Vehicles category
const EBAY_CATEGORY_ID = '222'

// Rate limiting
const REQUEST_DELAY_MS = 200 // 5 req/s stays well under limits
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ─── Types ───────────────────────────────────────────────────────

export interface EbayPriceResult {
  toyNum: string
  avgPrice: number | null        // USD average of sold listings
  minPrice: number | null
  maxPrice: number | null
  soldCount: number              // number of sold listings found
  currency: string
  lastChecked: string            // ISO timestamp
  searchQuery: string            // the query used
}

interface OAuthToken {
  accessToken: string
  expiresAt: number // epoch ms
}

// ─── Service ─────────────────────────────────────────────────────

let cachedToken: OAuthToken | null = null

export class EbayPriceService {
  /**
   * Check if eBay credentials are configured
   */
  static isConfigured(): boolean {
    return !!(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET)
  }

  /**
   * Get OAuth Application Access Token (Client Credentials Grant)
   */
  private static async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
      return cachedToken.accessToken
    }

    const clientId = process.env.EBAY_CLIENT_ID
    const clientSecret = process.env.EBAY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set in .env')
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const resp = await axios.post(
      EBAY_AUTH_URL,
      'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
      }
    )

    cachedToken = {
      accessToken: resp.data.access_token,
      expiresAt: Date.now() + (resp.data.expires_in - 60) * 1000,
    }

    return cachedToken.accessToken
  }

  /**
   * Search eBay Browse API for sold Hot Wheels items matching a toy number.
   * Returns price statistics.
   */
  static async getAveragePrice(
    toyNum: string,
    carModel?: string
  ): Promise<EbayPriceResult> {
    const now = new Date().toISOString()

    if (!this.isConfigured()) {
      return {
        toyNum,
        avgPrice: null,
        minPrice: null,
        maxPrice: null,
        soldCount: 0,
        currency: 'USD',
        lastChecked: now,
        searchQuery: '',
      }
    }

    // Build search query: "Hot Wheels <toy_num>"
    // toy_num is the most specific identifier (e.g. "GTD48", "HKH29")
    const query = `Hot Wheels ${toyNum}`

    try {
      const token = await this.getAccessToken()

      const resp = await axios.get(EBAY_BROWSE_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        },
        params: {
          q: query,
          category_ids: EBAY_CATEGORY_ID,
          filter: 'buyingOptions:{FIXED_PRICE|AUCTION},conditions:{NEW|LIKE_NEW|VERY_GOOD}',
          sort: 'newlyListed',
          limit: 50,
        },
      })

      const items = resp.data.itemSummaries || []

      if (items.length === 0) {
        return {
          toyNum, avgPrice: null, minPrice: null, maxPrice: null,
          soldCount: 0, currency: 'USD', lastChecked: now, searchQuery: query,
        }
      }

      // Extract prices (convert to numbers)
      const prices: number[] = []
      for (const item of items) {
        const priceVal = parseFloat(item.price?.value)
        const currency = item.price?.currency
        if (!isNaN(priceVal) && priceVal > 0 && currency === 'USD') {
          // Filter out unreasonable prices (likely lots or errors)
          if (priceVal < 500) {
            prices.push(priceVal)
          }
        }
      }

      if (prices.length === 0) {
        return {
          toyNum, avgPrice: null, minPrice: null, maxPrice: null,
          soldCount: 0, currency: 'USD', lastChecked: now, searchQuery: query,
        }
      }

      // Calculate statistics
      prices.sort((a, b) => a - b)

      // Remove outliers: trim top/bottom 10% if enough data
      let trimmedPrices = prices
      if (prices.length >= 10) {
        const trim = Math.floor(prices.length * 0.1)
        trimmedPrices = prices.slice(trim, prices.length - trim)
      }

      const avg = trimmedPrices.reduce((s, p) => s + p, 0) / trimmedPrices.length

      return {
        toyNum,
        avgPrice: Math.round(avg * 100) / 100,
        minPrice: prices[0],
        maxPrice: prices[prices.length - 1],
        soldCount: prices.length,
        currency: 'USD',
        lastChecked: now,
        searchQuery: query,
      }
    } catch (error: any) {
      // Handle specific eBay errors
      if (error.response?.status === 401) {
        cachedToken = null // Force token refresh
        console.error('eBay auth error — token expired, will retry on next call')
      } else {
        console.error(`eBay price lookup failed for ${toyNum}:`, error.message)
      }

      return {
        toyNum, avgPrice: null, minPrice: null, maxPrice: null,
        soldCount: 0, currency: 'USD', lastChecked: now, searchQuery: query,
      }
    }
  }

  /**
   * Batch fetch prices for multiple toy numbers.
   * Respects rate limits with delays between calls.
   */
  static async getAveragePrices(
    toyNums: string[],
    onProgress?: (done: number, total: number) => void
  ): Promise<Map<string, EbayPriceResult>> {
    const results = new Map<string, EbayPriceResult>()

    for (let i = 0; i < toyNums.length; i++) {
      const result = await this.getAveragePrice(toyNums[i])
      results.set(toyNums[i], result)

      if (onProgress) onProgress(i + 1, toyNums.length)
      if (i < toyNums.length - 1) await sleep(REQUEST_DELAY_MS)
    }

    return results
  }
}
