"use client";
import { useId } from "react";

const SKIN = ["#f2c6a0", "#e0a97d", "#c68a5e", "#f5d3b8", "#a86f48"];
const HAIR = ["#2b2118", "#4a3322", "#1c1c1c", "#6b4a2b", "#3a3a4a"];
const SHIRT = ["#2e86de", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#0ea5e9"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** อวตารสไตล์ 3D (SVG ไล่เฉดสี/เงา) สร้างจากชื่อ ไม่ต้องอัปโหลดรูป */
export default function Avatar3D({ name, size = 96 }: { name: string; size?: number }) {
  const uid = useId().replace(/:/g, "");
  const h = hash(name || "x");
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >> 3) % HAIR.length];
  const shirt = SHIRT[(h >> 5) % SHIRT.length];
  const style = (h >> 7) % 3; // ทรงผม
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={name}>
      <defs>
        <radialGradient id={`bg${uid}`} cx="35%" cy="30%" r="90%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dbeafe" />
        </radialGradient>
        <radialGradient id={`sk${uid}`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".55" />
          <stop offset=".45" stopColor={skin} />
          <stop offset="1" stopColor="#000" stopOpacity=".25" />
        </radialGradient>
        <linearGradient id={`sh${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shirt} />
          <stop offset="1" stopColor="#000" stopOpacity=".45" />
        </linearGradient>
        <clipPath id={`c${uid}`}><circle cx="50" cy="50" r="48" /></clipPath>
      </defs>
      <circle cx="50" cy="50" r="48" fill={`url(#bg${uid})`} stroke="#bfdbfe" strokeWidth="2" />
      <g clipPath={`url(#c${uid})`}>
        <ellipse cx="50" cy="96" rx="34" ry="26" fill={`url(#sh${uid})`} />
        <rect x="43" y="62" width="14" height="14" rx="5" fill={`url(#sk${uid})`} />
        <path d="M40 80 L50 90 L60 80 Z" fill="#fff" opacity=".85" />
        <ellipse cx="50" cy="44" rx="19" ry="21" fill={`url(#sk${uid})`} />
        {style === 0 && <path d="M30 42 Q31 20 50 20 Q69 20 70 42 Q62 30 50 31 Q38 30 30 42Z" fill={hair} />}
        {style === 1 && <path d="M30 46 Q26 18 50 19 Q74 18 70 46 Q66 28 50 29 Q34 28 30 46Z" fill={hair} />}
        {style === 2 && <path d="M31 38 Q40 18 60 22 Q71 27 69 40 Q58 28 31 38Z" fill={hair} />}
        <circle cx="43" cy="46" r="2.2" fill="#222" />
        <circle cx="57" cy="46" r="2.2" fill="#222" />
        <path d="M44 55 Q50 60 56 55" stroke="#7a3b2e" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* หมวกนิรภัย */}
        <path d="M30 34 Q50 8 70 34 Z" fill="#facc15" />
        <rect x="28" y="33" width="44" height="4" rx="2" fill="#eab308" />
        <ellipse cx="42" cy="24" rx="6" ry="3" fill="#fff" opacity=".45" />
      </g>
    </svg>
  );
}
