import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

/**
 * Raw Asteroid Ore Icon
 * Chiseled asteroid ore boulder / mineral cluster with metallic veins and warm amber facet sheen.
 */
export const OreIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, style }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width={size}
    height={size}
    style={style}
  >
    <defs>
      <linearGradient id="oreGrad" x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="45%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="oreFacet" x1="6" y1="6" x2="16" y2="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#d97706" stopOpacity="0.3" />
      </linearGradient>
    </defs>
    {/* Outer Ore Boulder */}
    <path
      d="M7 3L17 2L22 8L20 18L13 22L4 19L2 11L7 3Z"
      fill="url(#oreGrad)"
      stroke="#78350f"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    {/* Top-Left Specular Facet */}
    <path
      d="M7 3L14 7L8 12L2 11L7 3Z"
      fill="url(#oreFacet)"
      stroke="#fef08a"
      strokeWidth="0.8"
      strokeLinejoin="round"
      strokeOpacity="0.6"
    />
    {/* Center High-Grade Mineral Vein */}
    <path
      d="M14 7L17 2L22 8L16 13L14 7Z"
      fill="#d97706"
      stroke="#fbbf24"
      strokeWidth="0.8"
      strokeLinejoin="round"
      strokeOpacity="0.7"
    />
    {/* Bottom Facets */}
    <path
      d="M8 12L16 13L20 18L13 22L8 12Z"
      fill="#92400e"
      stroke="#f59e0b"
      strokeWidth="0.8"
      strokeLinejoin="round"
      strokeOpacity="0.5"
    />
    <path
      d="M4 19L8 12L13 22L4 19Z"
      fill="#78350f"
      stroke="#b45309"
      strokeWidth="0.8"
      strokeLinejoin="round"
      strokeOpacity="0.4"
    />
  </svg>
);

/**
 * Refined Metallic Alloy Ingot Icon
 * High-tech precision aerospace alloy ingots / machined hexagonal plate with steel-cyan specular luster.
 */
export const MetalIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, style }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width={size}
    height={size}
    style={style}
  >
    <defs>
      <linearGradient id="metalTop" x1="4" y1="4" x2="20" y2="12" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#bae6fd" />
        <stop offset="50%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <linearGradient id="metalFront" x1="2" y1="11" x2="22" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
      <linearGradient id="metalSide" x1="15" y1="9" x2="22" y2="18" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#075985" />
      </linearGradient>
    </defs>
    {/* Upper Ingot Top Bevel */}
    <path
      d="M7 4L17 4L21 8L11 8L7 4Z"
      fill="url(#metalTop)"
      stroke="#e0f2fe"
      strokeWidth="0.9"
      strokeLinejoin="round"
    />
    {/* Upper Ingot Front Face */}
    <path
      d="M7 4L11 8V12L7 8V4Z"
      fill="url(#metalSide)"
      stroke="#0284c7"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    <path
      d="M11 8L21 8V12L11 12V8Z"
      fill="url(#metalFront)"
      stroke="#38bdf8"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />

    {/* Lower Ingot Top */}
    <path
      d="M3 12L13 12L17 16L7 16L3 12Z"
      fill="url(#metalTop)"
      stroke="#e0f2fe"
      strokeWidth="0.9"
      strokeLinejoin="round"
    />
    {/* Lower Ingot Left Side */}
    <path
      d="M3 12L7 16V20L3 16V12Z"
      fill="url(#metalSide)"
      stroke="#0369a1"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    {/* Lower Ingot Front Face */}
    <path
      d="M7 16L17 16V20L7 20V16Z"
      fill="url(#metalFront)"
      stroke="#38bdf8"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    {/* Specular Highlight Line */}
    <line x1="7" y1="16" x2="17" y2="16" stroke="#f0f9ff" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

/**
 * Refined Organics / Bio-Hydrocarbon Compound Icon
 * Hexagonal bio-polymer cell lattice with radiant emerald green energy nodes.
 */
export const OrganicsIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, style }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width={size}
    height={size}
    style={style}
  >
    <defs>
      <linearGradient id="orgGrad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#86efac" />
        <stop offset="50%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#064e3b" />
      </linearGradient>
      <radialGradient id="orgGlow" cx="12" cy="12" r="9" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#bbf7d0" stopOpacity="0.9" />
        <stop offset="60%" stopColor="#22c55e" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* Center Glow */}
    <circle cx="12" cy="12" r="8" fill="url(#orgGlow)" />
    {/* Primary Hex Cell */}
    <path
      d="M12 2L20 7V17L12 22L4 17V7L12 2Z"
      stroke="url(#orgGrad)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Inner Tripod Molecular Bonds */}
    <path
      d="M12 12L12 2M12 12L20 17M12 12L4 17"
      stroke="#86efac"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeOpacity="0.9"
    />
    {/* Inner Concentric Core Hex */}
    <path
      d="M12 7L16 9.5V14.5L12 17L8 14.5V9.5L12 7Z"
      fill="#059669"
      fillOpacity="0.6"
      stroke="#a7f3d0"
      strokeWidth="1"
      strokeLinejoin="round"
    />
    {/* Glowing Atomic Nucleus Nodes */}
    <circle cx="12" cy="12" r="2" fill="#dcfce7" stroke="#15803d" strokeWidth="0.8" />
    <circle cx="12" cy="2" r="1.2" fill="#86efac" />
    <circle cx="20" cy="7" r="1.2" fill="#86efac" />
    <circle cx="20" cy="17" r="1.2" fill="#86efac" />
    <circle cx="12" cy="22" r="1.2" fill="#86efac" />
    <circle cx="4" cy="17" r="1.2" fill="#86efac" />
    <circle cx="4" cy="7" r="1.2" fill="#86efac" />
  </svg>
);

/**
 * Neridium Crystal Icon
 * Exotic crystalline octahedron / hyper-crystal prism with radiant violet-magenta core facets.
 */
export const NeridiumIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, style }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width={size}
    height={size}
    style={style}
  >
    <defs>
      <linearGradient id="neridMain" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f5d0fe" />
        <stop offset="35%" stopColor="#c084fc" />
        <stop offset="70%" stopColor="#9333ea" />
        <stop offset="100%" stopColor="#581c87" />
      </linearGradient>
      <linearGradient id="neridFacetL" x1="12" y1="2" x2="3" y2="12" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fae8ff" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#a855f7" stopOpacity="0.4" />
      </linearGradient>
      <linearGradient id="neridFacetR" x1="12" y1="2" x2="21" y2="12" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#e879f9" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#7e22ce" stopOpacity="0.5" />
      </linearGradient>
    </defs>
    {/* Crystal Geometry: Diamond Rhombus */}
    <path
      d="M12 1.5L21.5 9L12 22.5L2.5 9L12 1.5Z"
      fill="url(#neridMain)"
      stroke="#fae8ff"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    {/* Upper Left Shard */}
    <path
      d="M12 1.5L2.5 9L12 12L12 1.5Z"
      fill="url(#neridFacetL)"
      stroke="#f0abfc"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    {/* Upper Right Shard */}
    <path
      d="M12 1.5L21.5 9L12 12L12 1.5Z"
      fill="url(#neridFacetR)"
      stroke="#d8b4fe"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    {/* Lower Left Shard */}
    <path
      d="M2.5 9L12 22.5L12 12L2.5 9Z"
      fill="#6b21a8"
      fillOpacity="0.7"
      stroke="#a855f7"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    {/* Lower Right Shard */}
    <path
      d="M21.5 9L12 22.5L12 12L21.5 9Z"
      fill="#581c87"
      fillOpacity="0.9"
      stroke="#9333ea"
      strokeWidth="0.8"
      strokeLinejoin="round"
    />
    {/* Radiant Central Prism Core */}
    <polygon
      points="12,5 16,9 12,14 8,9"
      fill="#fdf4ff"
      fillOpacity="0.85"
      stroke="#fae8ff"
      strokeWidth="0.7"
    />
  </svg>
);
