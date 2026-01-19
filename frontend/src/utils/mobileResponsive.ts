/**
 * Mobile Responsive Utilities
 * Helper functions and hooks for responsive design
 */

// Breakpoints matching Tailwind
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

/**
 * Hook to detect current screen size
 */
export function useScreenSize() {
  const [screenSize, setScreenSize] = React.useState<Breakpoint>('lg')

  React.useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth

      if (width < BREAKPOINTS.sm) setScreenSize('sm')
      else if (width < BREAKPOINTS.md) setScreenSize('sm')
      else if (width < BREAKPOINTS.lg) setScreenSize('md')
      else if (width < BREAKPOINTS.xl) setScreenSize('lg')
      else if (width < BREAKPOINTS['2xl']) setScreenSize('xl')
      else setScreenSize('2xl')
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  return screenSize
}

/**
 * Check if device is mobile
 */
export function useIsMobile() {
  const screenSize = useScreenSize()
  return screenSize === 'sm'
}

/**
 * Check if device is tablet
 */
export function useIsTablet() {
  const screenSize = useScreenSize()
  return screenSize === 'md'
}

/**
 * Mobile-optimized form field styling
 */
export const MOBILE_FORM_CLASSES = {
  container: 'space-y-4 md:space-y-6',
  fieldGroup: 'flex flex-col md:flex-row md:gap-4',
  field: 'flex-1 mb-4 md:mb-0',
  label: 'block text-sm font-medium text-gray-700 mb-1 md:mb-2',
  input:
    'w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
  button: 'w-full md:w-auto px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-medium rounded-lg transition'
} as const

/**
 * Mobile-optimized grid
 */
export const getMobileGridClasses = (mobileCount = 1, tabletCount = 2, desktopCount = 3) => {
  return `grid grid-cols-${mobileCount} md:grid-cols-${tabletCount} lg:grid-cols-${desktopCount} gap-3 md:gap-4 lg:gap-6`
}

/**
 * Mobile-optimized modal/sheet
 */
export const MOBILE_MODAL_CLASSES = {
  backdrop: 'fixed inset-0 bg-black bg-opacity-50 z-40',
  container:
    'fixed bottom-0 md:bottom-auto md:top-1/2 left-0 md:left-1/2 right-0 md:right-auto w-full md:w-full max-w-md md:max-w-lg rounded-t-2xl md:rounded-2xl md:-translate-x-1/2 md:-translate-y-1/2 z-50',
  content: 'p-4 md:p-6 max-h-[90vh] md:max-h-[80vh] overflow-y-auto',
  header: 'flex items-center justify-between mb-4 md:mb-6'
} as const

/**
 * Touch-friendly button sizing
 */
export const TOUCH_FRIENDLY_CLASSES = {
  button: 'min-h-11 md:min-h-10 min-w-11 md:min-w-10 p-2 md:p-2',
  input: 'min-h-11 md:min-h-10 text-base md:text-sm',
  select: 'min-h-11 md:min-h-10 text-base md:text-sm'
} as const

/**
 * Safe area padding for notched devices
 */
export const SAFE_AREA_CLASSES = {
  top: 'pt-safe',
  bottom: 'pb-safe',
  left: 'pl-safe',
  right: 'pr-safe'
} as const

export default {
  useScreenSize,
  useIsMobile,
  useIsTablet,
  MOBILE_FORM_CLASSES,
  getMobileGridClasses,
  MOBILE_MODAL_CLASSES,
  TOUCH_FRIENDLY_CLASSES,
  SAFE_AREA_CLASSES,
  BREAKPOINTS
}
