import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

interface DonsolOceanProps {
  width?: number | string;
  height?: number | string;
  opacity?: number;
}

export function DonsolOcean({
  width = "100%",
  height = "100%",
  opacity = 1,
}: DonsolOceanProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 390 844"
      fill="none"
      opacity={opacity}
    >
      <Defs>
        <LinearGradient
          id="oceanGradient"
          x1="195"
          y1="0"
          x2="195"
          y2="844"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#E0F7FF" />
          <Stop offset="0.45" stopColor="#BCEEFF" />
          <Stop offset="1" stopColor="#8DD9F5" />
        </LinearGradient>

        <LinearGradient
          id="waveGradient"
          x1="0"
          y1="500"
          x2="390"
          y2="844"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.65" />
          <Stop offset="1" stopColor="#38BDF8" stopOpacity="0.2" />
        </LinearGradient>
      </Defs>

      {/* Ocean background */}
      <Path d="M0 0H390V844H0V0Z" fill="url(#oceanGradient)" />

      {/* Large soft wave */}
      <Path
        d="
          M0 495
          C60 455 105 475 155 505
          C215 540 270 550 330 505
          C355 486 375 480 390 485
          V844
          H0
          Z
        "
        fill="url(#waveGradient)"
      />

      {/* Secondary wave */}
      <Path
        d="
          M0 590
          C75 550 125 570 185 610
          C245 650 315 645 390 585
          V844
          H0
          Z
        "
        fill="#FFFFFF"
        fillOpacity="0.2"
      />

      {/* Whale shark silhouette */}
      <Path
        d="
          M76 365
          C100 343 138 332 179 334
          C220 336 259 348 286 365

          C305 377 324 389 343 391

          C328 402 311 406 294 403

          C275 400 258 392 243 386

          C228 395 213 403 197 406

          C178 410 157 407 139 400

          C120 393 101 384 84 379

          C76 376 71 370 76 365

          Z

          M196 342
          C203 321 218 306 237 299

          C230 320 229 335 235 348

          Z

          M159 342
          C148 323 136 309 118 301

          C132 327 137 339 137 350

          Z

          M92 368
          C72 352 55 345 37 347

          C57 360 68 371 78 382

          Z
        "
        fill="#0EA5E9"
        fillOpacity="0.24"
      />

      {/* Whale shark spots */}
      <Circle cx="137" cy="361" r="4" fill="#FFFFFF" fillOpacity="0.5" />
      <Circle cx="155" cy="375" r="3" fill="#FFFFFF" fillOpacity="0.45" />
      <Circle cx="181" cy="357" r="3" fill="#FFFFFF" fillOpacity="0.55" />
      <Circle cx="204" cy="374" r="4" fill="#FFFFFF" fillOpacity="0.4" />
      <Circle cx="228" cy="359" r="3" fill="#FFFFFF" fillOpacity="0.45" />
      <Circle cx="250" cy="377" r="3" fill="#FFFFFF" fillOpacity="0.5" />

      {/* Bubbles */}
      <Circle
        cx="63"
        cy="235"
        r="7"
        stroke="#FFFFFF"
        strokeOpacity="0.55"
        strokeWidth="2"
      />

      <Circle cx="83" cy="195" r="4" fill="#FFFFFF" fillOpacity="0.45" />

      <Circle
        cx="316"
        cy="255"
        r="8"
        stroke="#FFFFFF"
        strokeOpacity="0.45"
        strokeWidth="2"
      />

      <Circle cx="338" cy="218" r="4" fill="#FFFFFF" fillOpacity="0.5" />

      <Circle cx="295" cy="150" r="3" fill="#FFFFFF" fillOpacity="0.55" />
    </Svg>
  );
}
