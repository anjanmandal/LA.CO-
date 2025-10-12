// src/components/Brand/LouisianaMapIconGeo.jsx
import * as React from 'react';
import SvgIcon from '@mui/material/SvgIcon';
import { feature } from 'topojson-client';
import { geoIdentity, geoPath } from 'd3-geo';
// Small 10m-resolution US states topology (includes LA)
import states10m from 'us-atlas/states-10m.json' with { type: 'json' };

/**
 * LouisianaMapIconGeo — geo-true Louisiana silhouette from US Atlas.
 *
 * Props:
 *  - variant: "filled" | "outline"      (default: "filled")
 *  - fill: string                       (default: "currentColor")
 *  - stroke: string                     (default: "currentColor" — outline only)
 *  - strokeWidth: number                (default: 1.2 — outline only)
 *  - padding: number                    (default: 2)  // px padding inside 96×96 box
 */
export default function LouisianaMapIconGeo({
  variant = 'filled',
  fill = 'currentColor',
  stroke = 'currentColor',
  strokeWidth = 1.2,
  padding = 2,
  ...props
}) {
  const isOutline = variant === 'outline';

  // FIPS for Louisiana is 22
  const LA_FIPS = 22;

  // Extract the Louisiana GeoJSON feature
  const states = feature(states10m, states10m.objects.states);
  const laFeature = states.features.find(f => +f.id === LA_FIPS);

  // Build a path that fits inside 96×96 with padding
  const size = 96;
  const p = padding;
  const pathGen = React.useMemo(() => {
    // Fit to [ [p,p], [size-p, size-p] ]
    const proj = geoIdentity().reflectY(true);
    const tmp = geoPath(proj);
    proj.fitExtent([[p, p], [size - p, size - p]], laFeature);
    return geoPath(proj);
  }, [laFeature, p]);

  const d = React.useMemo(() => pathGen(laFeature) || '', [pathGen, laFeature]);

  return (
    <SvgIcon viewBox={`0 0 ${size} ${size}`} aria-label="Louisiana map (geo-true)" {...props}>
      <path
        d={d}
        fill={isOutline ? 'none' : fill}
        stroke={isOutline ? stroke : 'none'}
        strokeWidth={isOutline ? strokeWidth : 0}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </SvgIcon>
  );
}
