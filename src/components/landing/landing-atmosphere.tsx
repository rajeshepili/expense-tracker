import { useEffect, useRef } from 'react'
import { cn } from 'cn'
import { parallaxY } from '#/lib/motion'

const LAYERS = [
  { distance: 36 },
  { distance: 64 },
  { distance: 96 },
] as const

const WASH = [
  'radial-gradient(90% 55% at 85% 8%, color-mix(in oklch, var(--ring) 12%, transparent), transparent 58%)',
  'radial-gradient(70% 45% at 8% 55%, color-mix(in oklch, var(--income) 10%, transparent), transparent 55%)',
  'radial-gradient(60% 40% at 92% 78%, color-mix(in oklch, var(--expense) 6%, transparent), transparent 50%)',
].join(',')

const REEDS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2
  return {
    x1: 200 + Math.cos(a) * 168,
    y1: 200 + Math.sin(a) * 168,
    x2: 200 + Math.cos(a) * 178,
    y2: 200 + Math.sin(a) * 178,
  }
})

export function LandingAtmosphere({ className }: { className?: string }) {
  const layerRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    const stops = LAYERS.flatMap((layer, i) => {
      const el = layerRefs.current[i]
      return el ? [parallaxY(el, { distance: layer.distance })] : []
    })
    return () => {
      for (const stop of stops) stop()
    }
  }, [])

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 z-0 overflow-hidden',
        'text-foreground/20 dark:text-foreground/25',
        'motion-reduce:opacity-40',
        '[@media(prefers-reduced-transparency:reduce)]:opacity-30',
        className,
      )}
    >
      {/* Soft base so copy stays readable over the wash */}
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0 opacity-70 md:opacity-100"
        style={{ backgroundImage: WASH }}
      />
      {/* Mobile: fade art under the hero copy band */}
      <div className="absolute inset-x-0 top-0 h-[min(52svh,28rem)] bg-gradient-to-b from-background via-background/90 to-transparent md:hidden" />

      <div
        ref={(el) => {
          layerRefs.current[0] = el
        }}
        className="absolute inset-0 will-change-transform opacity-50 md:opacity-100"
      >
        <svg
          className="absolute -top-[12%] -right-[28%] h-[min(70vw,40rem)] w-[min(70vw,40rem)] md:-top-[18%] md:-right-[22%] md:h-[min(78vw,46rem)] md:w-[min(78vw,46rem)]"
          viewBox="0 0 400 400"
          fill="none"
        >
          <circle cx="200" cy="200" r="178" fill="var(--ring)" fillOpacity="0.1" />
          <circle cx="200" cy="200" r="148" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
          <circle cx="200" cy="200" r="118" stroke="currentColor" strokeWidth="1" opacity="0.35" />
          {REEDS.map((r, i) => (
            <line
              key={i}
              {...r}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.32"
            />
          ))}
          <path
            d="M 86 200 A 114 114 0 0 1 314 200"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.4"
          />
        </svg>
        <svg
          className="absolute top-[58%] -left-[28%] h-[min(48vw,18rem)] w-[min(48vw,18rem)] opacity-80 md:top-[22%] md:-left-[20%] md:h-[min(55vw,26rem)] md:w-[min(55vw,26rem)] md:opacity-100"
          viewBox="0 0 320 320"
          fill="none"
        >
          <path d="M 160 28 A 132 132 0 0 1 160 292 Z" fill="var(--income)" fillOpacity="0.08" />
          <path
            d="M 160 44 A 116 116 0 0 1 160 276"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      </div>

      <div
        ref={(el) => {
          layerRefs.current[1] = el
        }}
        className="absolute inset-0 will-change-transform opacity-40 md:opacity-100"
      >
        <svg
          className="absolute top-[36%] left-[4%] hidden h-56 w-72 opacity-70 md:block"
          viewBox="0 0 288 224"
          fill="none"
        >
          {Array.from({ length: 7 }, (_, i) => (
            <line
              key={i}
              x1="12"
              y1={28 + i * 28}
              x2="276"
              y2={28 + i * 28}
              stroke="currentColor"
              strokeWidth="1"
              opacity={0.22 + (i % 2) * 0.08}
            />
          ))}
          <line x1="56" y1="16" x2="56" y2="208" stroke="var(--expense)" strokeWidth="1" opacity="0.22" />
          <path d="M 72 56 H 96 M 84 44 V 68" stroke="var(--income)" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
          <path d="M 72 140 H 96" stroke="var(--expense)" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
        </svg>
        <svg
          className="absolute top-[72%] right-[-18%] h-[min(42vw,16rem)] w-[min(42vw,16rem)] md:top-[46%] md:right-[-4%] md:h-[min(44vw,20rem)] md:w-[min(44vw,20rem)]"
          viewBox="0 0 280 280"
          fill="none"
        >
          <circle cx="140" cy="140" r="104" stroke="currentColor" strokeWidth="1" opacity="0.28" />
          <path d="M 140 36 A 104 104 0 0 1 236 108" stroke="var(--income)" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
          <path d="M 236 108 A 104 104 0 0 1 168 240" stroke="var(--expense)" strokeWidth="2.5" strokeLinecap="round" opacity="0.24" />
          <path d="M 168 240 A 104 104 0 0 1 140 36" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.16" />
          <circle cx="140" cy="140" r="8" fill="currentColor" fillOpacity="0.22" />
        </svg>
      </div>

      <div
        ref={(el) => {
          layerRefs.current[2] = el
        }}
        className="absolute inset-0 hidden will-change-transform md:block"
      >
        <svg
          className="absolute top-[64%] -left-[6%] h-[min(38vw,18rem)] w-[min(38vw,18rem)]"
          viewBox="0 0 240 240"
          fill="none"
        >
          {Array.from({ length: 4 }, (_, i) => (
            <ellipse
              key={i}
              cx="108"
              cy={168 - i * 13}
              rx="42"
              ry="13"
              stroke="currentColor"
              strokeWidth="1.2"
              opacity={0.28 + i * 0.1}
              fill={i === 3 ? 'var(--ring)' : 'none'}
              fillOpacity={i === 3 ? 0.07 : undefined}
            />
          ))}
          <path d="M 24 120 A 96 96 0 0 0 216 120" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" opacity="0.45" />
        </svg>
        <svg className="absolute top-[58%] right-[18%] h-16 w-40 opacity-60" viewBox="0 0 160 64" fill="none">
          <path
            d="M 4 44 C 24 40, 36 28, 52 30 C 72 32, 84 18, 104 20 C 124 22, 136 12, 156 10"
            stroke="var(--income)"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d="M 4 52 C 28 50, 44 48, 64 46 C 88 44, 112 42, 156 36"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.28"
          />
        </svg>
        <svg
          className="absolute -bottom-[6%] right-[6%] h-[min(32vw,14rem)] w-[min(32vw,14rem)]"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="100" cy="100" r="86" stroke="currentColor" strokeWidth="1.15" opacity="0.55" />
          <circle cx="100" cy="100" r="58" stroke="currentColor" strokeWidth="1" strokeDasharray="3 9" opacity="0.32" />
          <path d="M 28 100 A 72 72 0 0 1 172 100" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
        </svg>
      </div>
    </div>
  )
}
