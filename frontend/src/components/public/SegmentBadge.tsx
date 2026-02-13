/**
 * SegmentBadge — shows a colored pill badge for vehicle segment type.
 *
 * Segments:
 *  mainline      → gray
 *  premium       → amber / gold
 *  fast_furious   → blue
 *  elite_64       → purple
 *  rlc            → red
 *  sth            → gradient gold (Super Treasure Hunt)
 *  th             → green (Treasure Hunt)
 *  monster_truck   → orange
 *  other          → slate
 */

interface SegmentBadgeProps {
    segment?: string
    size?: 'sm' | 'md'
}

const SEGMENT_CONFIG: Record<string, { label: string; bg: string; text: string; border?: string }> = {
    mainline: { label: 'Mainline', bg: 'bg-slate-600', text: 'text-slate-100' },
    premium: { label: 'Premium', bg: 'bg-amber-500', text: 'text-black' },
    fast_furious: { label: 'Fast & Furious', bg: 'bg-blue-600', text: 'text-white' },
    elite_64: { label: 'Elite 64', bg: 'bg-purple-600', text: 'text-white' },
    rlc: { label: 'RLC', bg: 'bg-red-600', text: 'text-white' },
    sth: { label: '$TH', bg: 'bg-gradient-to-r from-yellow-400 to-amber-500', text: 'text-black' },
    th: { label: 'TH', bg: 'bg-emerald-600', text: 'text-white' },
    monster_truck: { label: 'Monster Truck', bg: 'bg-orange-600', text: 'text-white' },
    other: { label: 'Otro', bg: 'bg-slate-500', text: 'text-slate-100' },
}

export default function SegmentBadge({ segment, size = 'sm' }: SegmentBadgeProps) {
    if (!segment) return null

    const config = SEGMENT_CONFIG[segment]
    if (!config) return null

    // Don't show badge for plain mainline — it's the default, save visual space
    if (segment === 'mainline') return null

    const sizeClass = size === 'sm'
        ? 'px-2 py-0.5 text-[10px]'
        : 'px-2.5 py-1 text-xs'

    return (
        <span
            className={`inline-block font-bold uppercase tracking-wide rounded-full whitespace-nowrap ${config.bg} ${config.text} ${sizeClass}`}
        >
            {config.label}
        </span>
    )
}

/** Get the display label for a segment (useful outside the badge component) */
export function getSegmentLabel(segment?: string): string {
    if (!segment) return 'Mainline'
    return SEGMENT_CONFIG[segment]?.label || segment
}
