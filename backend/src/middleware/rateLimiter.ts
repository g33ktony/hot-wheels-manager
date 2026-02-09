import rateLimit from 'express-rate-limit'

/**
 * Rate limiter for public catalog endpoints
 * Allows 100 requests per 15 minutes per IP
 */
export const publicCatalogLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

/**
 * Stricter rate limiter for lead creation
 * Allows 5 submissions per hour per IP to prevent spam
 */
export const leadCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 lead submissions per hour
  message: {
    success: false,
    error: 'Demasiados intentos de registro. Por favor intenta de nuevo en 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests from counting (optional - only count failed attempts)
  skipSuccessfulRequests: false
})
