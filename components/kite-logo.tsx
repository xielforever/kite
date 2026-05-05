import { cn } from "@/lib/utils";

export function KiteLogo({
  size = 28,
  showText = true,
  className,
}: {
  size?: number;
  showText?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold text-foreground", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M20 3.5 34.5 18 20 36.5 5.5 18 20 3.5Z"
          fill="url(#kite-fill)"
          stroke="#1D4ED8"
          strokeWidth="2"
        />
        <path d="M20 3.5v33M5.5 18h29M20 3.5l-6.5 25L34.5 18" stroke="#0F766E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 36.5c2.8 2.2 5.2 2.2 7.2 0" stroke="#1D4ED8" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="20" cy="3.5" r="2.2" fill="#0F766E" />
        <circle cx="34.5" cy="18" r="2" fill="#1D4ED8" />
        <circle cx="13.5" cy="28.5" r="1.8" fill="#0F766E" />
        <defs>
          <linearGradient id="kite-fill" x1="7" x2="33" y1="5" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EFF6FF" />
            <stop offset="1" stopColor="#E0F2FE" />
          </linearGradient>
        </defs>
      </svg>
      {showText ? <span>Kite</span> : null}
    </span>
  );
}
