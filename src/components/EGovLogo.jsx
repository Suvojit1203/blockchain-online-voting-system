export default function EGovLogo({ className = "h-16 w-16" }) {
  return (
    <svg
      aria-label="E-Election of India logo"
      className={className}
      viewBox="0 0 96 96"
      role="img"
    >
      <circle cx="48" cy="48" fill="#ffffff" r="45" />
      <path
        d="M22 36c12-14 30-19 52-15-10 5-19 12-27 21-9-4-17-6-25-6Z"
        fill="#ff8f1f"
      />
      <path
        d="M21 58c18-8 35-7 54 3-12 9-31 13-53 7 8-3 16-6 24-10-8-2-16-2-25 0Z"
        fill="#128807"
      />
      <circle cx="48" cy="48" fill="#ffffff" r="20" stroke="#1e3a8a" strokeWidth="3" />
      {Array.from({ length: 16 }).map((_, index) => {
        const angle = (index * Math.PI) / 8;
        const x1 = 48 + Math.cos(angle) * 5;
        const y1 = 48 + Math.sin(angle) * 5;
        const x2 = 48 + Math.cos(angle) * 17;
        const y2 = 48 + Math.sin(angle) * 17;

        return (
          <line
            key={index}
            stroke="#1e3a8a"
            strokeLinecap="round"
            strokeWidth="1.5"
            x1={x1}
            x2={x2}
            y1={y1}
            y2={y2}
          />
        );
      })}
      <rect
        fill="#ffffff"
        height="21"
        rx="4"
        stroke="#0f766e"
        strokeWidth="3"
        width="26"
        x="35"
        y="34"
      />
      <path
        d="m40 44 6 6 11-13"
        fill="none"
        stroke="#0f766e"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path d="M34 61h28" stroke="#1f2937" strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}
