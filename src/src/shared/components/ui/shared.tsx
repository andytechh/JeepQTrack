import type { CSSProperties, ReactNode } from "react";

// ─── Token shortcuts ────────────────────────────────────────────────────────
export const c = {
  ocean: "#0ea5e9",
  sky: "#38bdf8",
  teal: "#22d3ee",
  deep: "#0a1628",
  deep800: "#0f2040",
  navy: "#0c4a6e",
  bg: "#f8fbff",
  card: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  border: "rgba(14,165,233,0.12)",
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  purple: "#a855f7",
};

// ─── Reusable primitives ─────────────────────────────────────────────────────

export function StatusBar({ dark: _dark = false }: { dark?: boolean }) {
  return <div style={{ height: 54 }} />;
}

export function BottomSafeArea() {
  return <div style={{ height: 32 }} />;
}

export function Card({
  children,
  style,
  className = "",
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div className={`glass-card rounded-2xl p-4 ${className}`} style={style}>
      {children}
    </div>
  );
}

export function OceanCard({
  children,
  style,
  className = "",
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{
        background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
        boxShadow: "0 8px 32px rgba(14,165,233,0.3)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function GlassCard({
  children,
  style,
  className = "",
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.2)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  style,
  fullWidth = false,
  small = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
  fullWidth?: boolean;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
        color: "#fff",
        border: "none",
        borderRadius: 14,
        padding: small ? "10px 20px" : "16px 24px",
        fontSize: small ? 13 : 15,
        fontWeight: 600,
        cursor: "pointer",
        width: fullWidth ? "100%" : "auto",
        boxShadow: "0 4px 16px rgba(14,165,233,0.35)",
        fontFamily: "Inter, sans-serif",
        letterSpacing: "-0.01em",
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  style,
  fullWidth = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "rgba(14,165,233,0.08)",
        color: c.ocean,
        border: `1.5px solid rgba(14,165,233,0.2)`,
        borderRadius: 14,
        padding: "14px 24px",
        fontSize: 15,
        fontWeight: 600,
        cursor: "pointer",
        width: fullWidth ? "100%" : "auto",
        fontFamily: "Inter, sans-serif",
        letterSpacing: "-0.01em",
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Chip({
  label,
  color = "ocean",
  small = false,
}: {
  label: string;
  color?: "ocean" | "success" | "warning" | "error" | "purple" | "muted";
  small?: boolean;
}) {
  const colorMap = {
    ocean: {
      bg: "rgba(14,165,233,0.1)",
      text: "#0284c7",
      border: "rgba(14,165,233,0.2)",
    },
    success: {
      bg: "rgba(34,197,94,0.1)",
      text: "#16a34a",
      border: "rgba(34,197,94,0.2)",
    },
    warning: {
      bg: "rgba(245,158,11,0.1)",
      text: "#d97706",
      border: "rgba(245,158,11,0.2)",
    },
    error: {
      bg: "rgba(239,68,68,0.1)",
      text: "#dc2626",
      border: "rgba(239,68,68,0.2)",
    },
    purple: {
      bg: "rgba(168,85,247,0.1)",
      text: "#9333ea",
      border: "rgba(168,85,247,0.2)",
    },
    muted: {
      bg: "rgba(100,116,139,0.1)",
      text: "#475569",
      border: "rgba(100,116,139,0.2)",
    },
  };
  const clr = colorMap[color];
  return (
    <span
      style={{
        background: clr.bg,
        color: clr.text,
        border: `1px solid ${clr.border}`,
        borderRadius: 20,
        padding: small ? "3px 8px" : "5px 12px",
        fontSize: small ? 10 : 11,
        fontWeight: 600,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
}

export function Avatar({
  initials,
  size = 40,
  color,
}: {
  initials: string;
  size?: number;
  color?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: color || "linear-gradient(135deg, #0ea5e9, #0369a1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: size * 0.35,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export function Badge({ count }: { count: number }) {
  return (
    <span
      style={{
        background: c.error,
        color: "#fff",
        borderRadius: 10,
        padding: "2px 6px",
        fontSize: 10,
        fontWeight: 700,
        minWidth: 18,
        textAlign: "center",
        display: "inline-block",
      }}
    >
      {count}
    </span>
  );
}

export function SkeletonLine({
  width = "100%",
  height = 14,
}: {
  width?: string | number;
  height?: number;
}) {
  return <div className="skeleton" style={{ width, height }} />;
}

export function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: "rgba(14,165,233,0.08)",
        margin: "8px 0",
      }}
    />
  );
}

// Wave SVG decoration
export function WaveDecoration({
  color = "rgba(255,255,255,0.08)",
  style,
}: {
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 390 120"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        ...style,
      }}
      preserveAspectRatio="none"
    >
      <path
        d="M0,60 C80,100 160,20 240,60 C320,100 360,40 390,60 L390,120 L0,120 Z"
        fill={color}
      />
    </svg>
  );
}

export function WaveBg({
  color = "rgba(14,165,233,0.06)",
}: {
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 390 200"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        width: "100%",
        pointerEvents: "none",
      }}
      preserveAspectRatio="none"
    >
      <path d="M0,80 C100,120 200,40 390,90 L390,0 L0,0 Z" fill={color} />
    </svg>
  );
}

// Tab bar icon helpers
export function TabBar({
  items,
  active,
  onSelect,
}: {
  items: { icon: ReactNode; label: string; key: string }[];
  active: string;
  onSelect?: (key: string) => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(14,165,233,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        paddingBottom: 16,
        zIndex: 50,
      }}
    >
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onSelect?.(item.key)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "6px 12px",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              color: active === item.key ? c.ocean : "#94a3b8",
              transition: "color 0.2s",
            }}
          >
            {item.icon}
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: active === item.key ? 600 : 400,
              color: active === item.key ? c.ocean : "#94a3b8",
              transition: "color 0.2s",
            }}
          >
            {item.label}
          </span>
          {active === item.key && (
            <div
              style={{
                position: "absolute",
                top: 0,
                width: 24,
                height: 3,
                background: c.ocean,
                borderRadius: "0 0 3px 3px",
              }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

export function MapPlaceholder({
  height = 200,
  children,
}: {
  height?: number;
  children?: ReactNode;
}) {
  return (
    <div
      style={{
        height,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        background: "#e8f4fd",
      }}
    >
      {/* Grid lines simulating map */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
        viewBox="0 0 358 200"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect width="358" height="200" fill="#dbeafe" />
        {/* Roads */}
        <rect x="0" y="90" width="358" height="12" fill="#fff" opacity="0.8" />
        <rect x="0" y="60" width="358" height="6" fill="#fff" opacity="0.5" />
        <rect x="0" y="140" width="358" height="6" fill="#fff" opacity="0.5" />
        <rect x="80" y="0" width="10" height="200" fill="#fff" opacity="0.5" />
        <rect x="180" y="0" width="12" height="200" fill="#fff" opacity="0.8" />
        <rect x="280" y="0" width="8" height="200" fill="#fff" opacity="0.5" />
        {/* Blocks */}
        <rect
          x="20"
          y="20"
          width="50"
          height="30"
          rx="4"
          fill="#bfdbfe"
          opacity="0.6"
        />
        <rect
          x="20"
          y="110"
          width="50"
          height="20"
          rx="4"
          fill="#bfdbfe"
          opacity="0.6"
        />
        <rect
          x="100"
          y="20"
          width="70"
          height="30"
          rx="4"
          fill="#bfdbfe"
          opacity="0.6"
        />
        <rect
          x="100"
          y="110"
          width="70"
          height="20"
          rx="4"
          fill="#bfdbfe"
          opacity="0.6"
        />
        <rect
          x="200"
          y="20"
          width="60"
          height="30"
          rx="4"
          fill="#bfdbfe"
          opacity="0.6"
        />
        <rect
          x="200"
          y="110"
          width="60"
          height="20"
          rx="4"
          fill="#bfdbfe"
          opacity="0.6"
        />
        <rect
          x="295"
          y="20"
          width="50"
          height="30"
          rx="4"
          fill="#bfdbfe"
          opacity="0.6"
        />
        <rect
          x="295"
          y="110"
          width="50"
          height="20"
          rx="4"
          fill="#bfdbfe"
          opacity="0.6"
        />
        {/* Route line */}
        <path
          d="M30,96 C80,96 130,96 180,96 C230,96 280,96 340,96"
          stroke="#0ea5e9"
          strokeWidth="3"
          fill="none"
          strokeDasharray="none"
          opacity="0.8"
        />
        {/* Destination markers */}
        <circle cx="340" cy="96" r="8" fill="#0ea5e9" />
        <circle cx="340" cy="96" r="4" fill="#fff" />
      </svg>
      {children}
    </div>
  );
}
