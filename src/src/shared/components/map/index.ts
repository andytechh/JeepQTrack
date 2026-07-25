// src/shared/components/map/index.ts
//
// Metro resolves `./TerminalMap` to `.web.tsx` on web and `.native.tsx` on
// iOS/Android automatically, so callers just import from here.
export { default as TerminalMap } from "./TerminalMap";
export type { MapJeepney, TerminalMapProps } from "./types";
