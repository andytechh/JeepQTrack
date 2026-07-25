import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  time?: string;
  statusLight?: boolean;
  darkStatus?: boolean;
}

export default function PhoneFrame({
  children,
  time = "9:41",
  darkStatus = false,
}: Props) {
  const textColor = darkStatus ? "text-white/90" : "text-slate-800";
  const iconColor = darkStatus ? "fill-white/90" : "fill-slate-700";

  return (
    <div
      className="relative mx-auto"
      style={{
        width: 390,
        height: 844,
        borderRadius: 50,
        background: "#1a1a2e",
        boxShadow:
          "0 40px 120px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 2px #2a2a3e",
        overflow: "hidden",
      }}
    >
      {/* Side buttons */}
      <div
        style={{
          position: "absolute",
          left: -3,
          top: 120,
          width: 3,
          height: 34,
          background: "#2a2a3e",
          borderRadius: "3px 0 0 3px",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -3,
          top: 166,
          width: 3,
          height: 64,
          background: "#2a2a3e",
          borderRadius: "3px 0 0 3px",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -3,
          top: 242,
          width: 3,
          height: 64,
          background: "#2a2a3e",
          borderRadius: "3px 0 0 3px",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -3,
          top: 166,
          width: 3,
          height: 96,
          background: "#2a2a3e",
          borderRadius: "0 3px 3px 0",
        }}
      />

      {/* Screen */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 48,
          overflow: "hidden",
          background: "#f8fbff",
        }}
      >
        {/* Status bar */}
        <div
          className={`relative flex items-center justify-between px-8 ${textColor}`}
          style={{
            height: 50,
            paddingTop: 14,
            zIndex: 100,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          <span className="text-[13px] font-semibold tracking-tight">
            {time}
          </span>
          <div
            style={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              width: 120,
              height: 32,
              background: "#0a0a14",
              borderRadius: 20,
            }}
          />
          <div className="flex items-center gap-1.5">
            <svg
              width="16"
              height="12"
              viewBox="0 0 16 12"
              className={iconColor}
            >
              <rect x="0" y="3" width="3" height="9" rx="1" opacity="0.4" />
              <rect x="4.5" y="2" width="3" height="10" rx="1" opacity="0.6" />
              <rect x="9" y="0" width="3" height="12" rx="1" opacity="0.8" />
              <rect x="13.5" y="0" width="2.5" height="12" rx="1" />
            </svg>
            <svg
              width="15"
              height="12"
              viewBox="0 0 15 12"
              className={iconColor}
            >
              <path d="M7.5 1C4.5 1 1.8 2.3 0 4.4l1.5 1.4C3 4.2 5.1 3 7.5 3s4.5 1.2 6 2.8L15 4.4C13.2 2.3 10.5 1 7.5 1z" />
              <path d="M7.5 5c-1.6 0-3 .7-4 1.8l1.5 1.4c.6-.7 1.5-1.2 2.5-1.2s1.9.5 2.5 1.2L11.5 6.8C10.5 5.7 9.1 5 7.5 5z" />
              <circle cx="7.5" cy="10.5" r="1.5" />
            </svg>
            <svg
              width="25"
              height="12"
              viewBox="0 0 25 12"
              className={iconColor}
            >
              <rect
                x="0"
                y="2"
                width="21"
                height="8"
                rx="2"
                strokeWidth="1.5"
                fill="none"
                stroke="currentColor"
                className={darkStatus ? "stroke-white/70" : "stroke-slate-600"}
              />
              <rect x="1.5" y="3.5" width="14" height="5" rx="1" />
              <rect x="22" y="4" width="2.5" height="4" rx="1" opacity="0.5" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflowY: "auto",
            overflowX: "hidden",
          }}
          className="scrollbar-hide"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
