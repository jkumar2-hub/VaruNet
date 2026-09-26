/**
 * OceanGlobe3D — VaruNet v3
 * Full 3D interactive ocean globe with:
 *   • NASA Blue Marble Earth (96×96 sphere, normal + specular maps)
 *   • Dynamic Volumetric Ocean Data Overlay (0–2,000m) with live multi-palette support
 *     (Thermal, Viridis, Jet, Plasma, RdBu), variable scaling, opacity & dynamic isotherms
 *   • 16 real Argo float markers with interactive 3D sounding profiling animation
 *   • 6 real Glider missions with 3D sawtooth (yo-yo) animated transect flight
 *   • Animated Lagrangian SAR survival craft beacon with expanding search radius
 *   • Dynamic Indian Ocean current streamlines with real-time particle drift & monsoonal reversal
 *
 * SIH 2026 | PS 26067 | Ministry of Earth Sciences / INCOIS
 */
import React, { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Sphere, Html, Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { ArgoFloat, GliderMission, DriftWaypoint } from '../api/client';
import type { ColorbBarSettings } from './ColorbarPanel';
import { createProceduralEarthTexture } from '../utils/proceduralEarth';

// ─── Public types ─────────────────────────────────────────────────────────────
export interface GridData {
  variable: string;
  depth: number;
  units: string;
  lats: number[];
  lons: number[];
  data: number[][];
  source?: string;
  cache_notice?: string | null;
}

// ─── Coordinate helper ────────────────────────────────────────────────────────
const GLOBE_R = 10.0;

export function latLonToXYZ(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

// Preload NASA Earth textures for instantaneous availability
useTexture.preload('/earth_day.jpg');
useTexture.preload('/earth_normal.jpg');
useTexture.preload('/earth_specular.jpg');

// ─── Earth Globe (NASA Blue Marble photorealistic Earth) ─────────────────────
const EarthSphere: React.FC = () => {
  const [day, normal, specular] = useTexture([
    '/earth_day.jpg',
    '/earth_normal.jpg',
    '/earth_specular.jpg',
  ]);

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_R, 96, 96]} />
      <meshStandardMaterial
        color="#ffffff"
        map={day}
        normalMap={normal}
        normalScale={new THREE.Vector2(0.85, 0.85)}
        roughnessMap={specular}
        roughness={0.65}
        metalness={0.08}
      />
    </mesh>
  );
};

// ─── Procedural Earth Globe ──────────────────────────────────────────────────
const ProceduralEarth: React.FC = () => {
  const texture = useMemo(() => createProceduralEarthTexture(), []);
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_R, 64, 64]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.7}
        metalness={0.15}
      />
    </mesh>
  );
};

const EarthFallback: React.FC = () => (
  <mesh>
    <sphereGeometry args={[GLOBE_R, 64, 64]} />
    <meshStandardMaterial color="#0c2340" roughness={0.7} metalness={0.1} />
  </mesh>
);

const EarthGlobe: React.FC<{ style?: 'photorealistic' | 'cartographic' }> = ({
  style = 'photorealistic',
}) => {
  return (
    <group>
      {style === 'cartographic' ? (
        <ProceduralEarth />
      ) : (
        <React.Suspense fallback={<EarthFallback />}>
          <EarthSphere />
        </React.Suspense>
      )}

      {/* Atmospheric Halo Glow */}
      <mesh>
        <sphereGeometry args={[GLOBE_R * 1.018, 64, 64]} />
        <meshBasicMaterial
          color={style === 'cartographic' ? '#0F6E56' : '#38bdf8'}
          transparent
          opacity={style === 'cartographic' ? 0.08 : 0.06}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
};

// ─── Palette Color Interpolator ──────────────────────────────────────────────
function getPaletteColor(palette: string, norm: number, target: THREE.Color): THREE.Color {
  const n = Math.max(0, Math.min(1, norm));
  const c1 = new THREE.Color();
  const c2 = new THREE.Color();

  if (palette === 'Viridis') {
    if (n < 0.33) {
      c1.set('#440154'); c2.set('#31688e');
      return target.lerpColors(c1, c2, n / 0.33);
    } else if (n < 0.66) {
      c1.set('#31688e'); c2.set('#35b779');
      return target.lerpColors(c1, c2, (n - 0.33) / 0.33);
    } else {
      c1.set('#35b779'); c2.set('#fde725');
      return target.lerpColors(c1, c2, (n - 0.66) / 0.34);
    }
  } else if (palette === 'Jet') {
    if (n < 0.25) {
      c1.set('#00007f'); c2.set('#0000ff');
      return target.lerpColors(c1, c2, n / 0.25);
    } else if (n < 0.50) {
      c1.set('#0000ff'); c2.set('#00ffff');
      return target.lerpColors(c1, c2, (n - 0.25) / 0.25);
    } else if (n < 0.75) {
      c1.set('#00ffff'); c2.set('#ffff00');
      return target.lerpColors(c1, c2, (n - 0.50) / 0.25);
    } else {
      c1.set('#ffff00'); c2.set('#ff0000');
      return target.lerpColors(c1, c2, (n - 0.75) / 0.25);
    }
  } else if (palette === 'Plasma') {
    if (n < 0.25) {
      c1.set('#0d0887'); c2.set('#7e03a8');
      return target.lerpColors(c1, c2, n / 0.25);
    } else if (n < 0.50) {
      c1.set('#7e03a8'); c2.set('#cc4778');
      return target.lerpColors(c1, c2, (n - 0.25) / 0.25);
    } else if (n < 0.75) {
      c1.set('#cc4778'); c2.set('#f89441');
      return target.lerpColors(c1, c2, (n - 0.50) / 0.25);
    } else {
      c1.set('#f89441'); c2.set('#f0f921');
      return target.lerpColors(c1, c2, (n - 0.75) / 0.25);
    }
  } else if (palette === 'RdBu') {
    if (n < 0.25) {
      c1.set('#053061'); c2.set('#2166ac');
      return target.lerpColors(c1, c2, n / 0.25);
    } else if (n < 0.50) {
      c1.set('#2166ac'); c2.set('#f7f7f7');
      return target.lerpColors(c1, c2, (n - 0.25) / 0.25);
    } else if (n < 0.75) {
      c1.set('#f7f7f7'); c2.set('#d6604d');
      return target.lerpColors(c1, c2, (n - 0.50) / 0.25);
    } else {
      c1.set('#d6604d'); c2.set('#67001f');
      return target.lerpColors(c1, c2, (n - 0.75) / 0.25);
    }
  } else {
    // Thermal default
    if (n < 0.16) {
      c1.set('#020b1e'); c2.set('#033b8a');
      return target.lerpColors(c1, c2, n / 0.16);
    } else if (n < 0.35) {
      c1.set('#033b8a'); c2.set('#0284c7');
      return target.lerpColors(c1, c2, (n - 0.16) / 0.19);
    } else if (n < 0.55) {
      c1.set('#0284c7'); c2.set('#00e5ff');
      return target.lerpColors(c1, c2, (n - 0.35) / 0.20);
    } else if (n < 0.72) {
      c1.set('#00e5ff'); c2.set('#10b981');
      return target.lerpColors(c1, c2, (n - 0.55) / 0.17);
    } else if (n < 0.88) {
      c1.set('#10b981'); c2.set('#ffb703');
      return target.lerpColors(c1, c2, (n - 0.72) / 0.16);
    } else {
      c1.set('#ffb703'); c2.set('#f43f5e');
      return target.lerpColors(c1, c2, (n - 0.88) / 0.12);
    }
  }
}

// ─── Luminous Hydrodynamic Ocean Data Overlay ─────────────────────────────────
const OceanLayer: React.FC<{
  gridData: GridData;
  variable: string;
  depth?: number;
  colorbarSettings?: ColorbBarSettings;
  showIsoline?: boolean;
  isolineTemp?: number;
}> = ({
  gridData,
  variable,
  depth = 0,
  colorbarSettings,
  showIsoline = false,
  isolineTemp = 28,
}) => {
  const { lats, lons, data } = gridData;

  const palette = colorbarSettings?.palette ?? 'Thermal';
  const scale = colorbarSettings?.scale ?? 'linear';
  const opacity = colorbarSettings?.opacity ?? 85;
  const vExag = colorbarSettings?.vExag ?? 1;

  // Depth dynamically contracts the ocean layer into the water column with vertical exaggeration
  const depthFactor = Math.min(2000, Math.max(0, depth)) / 2000;
  const layerR = GLOBE_R + 0.052 - depthFactor * (0.032 * vExag);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseOpacity: { value: (opacity / 100) * 0.78 },
      },
      vertexShader: `
        attribute vec3 color;
        attribute float aAlpha;
        attribute vec2 aLatLon;

        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vColor;
        varying float vAlpha;
        varying vec2 vLatLon;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vColor = color;
          vAlpha = aAlpha;
          vLatLon = aLatLon;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uBaseOpacity;

        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vColor;
        varying float vAlpha;
        varying vec2 vLatLon;

        void main() {
          if (vAlpha <= 0.001) discard;

          float wave1 = sin(vLatLon.x * 0.28 + vLatLon.y * 0.22 - uTime * 1.5);
          float wave2 = cos(vLatLon.x * 0.45 - vLatLon.y * 0.28 + uTime * 1.1);
          float shimmer = (wave1 * 0.6 + wave2 * 0.4) * 0.032;

          vec3 viewDir = normalize(vViewPosition);
          float NdotV = max(0.0, dot(vNormal, viewDir));
          float fresnel = pow(1.0 - NdotV, 2.5) * 0.25;

          vec3 finalColor = vColor * 1.12 + vec3(fresnel * 0.22) + vec3(shimmer * 0.06);
          float finalAlpha = clamp(vAlpha * (uBaseOpacity + shimmer + fresnel * 0.25), 0.0, 0.95);

          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  // Animate hydrodynamic surface shimmer via useFrame and update opacity
  useFrame((_, delta) => {
    if (shaderMaterial?.uniforms?.uTime) {
      shaderMaterial.uniforms.uTime.value += delta;
    }
    if (shaderMaterial?.uniforms?.uBaseOpacity) {
      shaderMaterial.uniforms.uBaseOpacity.value = (opacity / 100) * 0.78;
    }
  });

  const geometry = useMemo(() => {
    const nLat = lats.length;
    const nLon = lons.length;
    if (nLat < 2 || nLon < 2 || !data || data.length < 2) return new THREE.BufferGeometry();

    const dLat = (lats[nLat - 1] - lats[0]) / (nLat - 1);
    const dLon = (lons[nLon - 1] - lons[0]) / (nLon - 1);

    const SUBDIV = 3;
    const nFineLat = (nLat - 1) * SUBDIV + 1;
    const nFineLon = (nLon - 1) * SUBDIV + 1;

    const positions: number[] = [];
    const colors: number[] = [];
    const alphas: number[] = [];
    const latLons: number[] = [];
    const indices: number[] = [];

    const defaultRanges: Record<string, [number, number]> = {
      temperature: [2, 34],
      salinity: [28, 38],
      density: [1024, 1030],
    };
    const [defMin, defMax] = defaultRanges[variable] ?? [2, 34];
    const minV = colorbarSettings?.vmin !== undefined ? colorbarSettings.vmin : defMin;
    const maxV = (colorbarSettings?.vmax !== undefined && colorbarSettings.vmax > minV) ? colorbarSettings.vmax : defMax;

    function smoothstep(e0: number, e1: number, x: number) {
      const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
      return t * t * (3 - 2 * t);
    }

    const tempCol = new THREE.Color();

    const latMin = lats[0];
    const latMax = lats[nLat - 1];
    const lonMin = lons[0];
    const lonMax = lons[nLon - 1];

    const vertexIndexGrid: number[][] = [];

    for (let fi = 0; fi < nFineLat; fi++) {
      const rowIndices: number[] = [];
      const lat = latMin + fi * (dLat / SUBDIV);

      const southFade = smoothstep(latMin, latMin + 7.0, lat);
      const northFade = 1.0 - smoothstep(latMax - 4.5, latMax, lat);
      const latDomainFade = southFade * northFade;

      const ci = Math.min(nLat - 2, Math.floor(fi / SUBDIV));
      const u = (fi - ci * SUBDIV) / SUBDIV;

      for (let fj = 0; fj < nFineLon; fj++) {
        const lon = lonMin + fj * (dLon / SUBDIV);

        const westFade = smoothstep(lonMin, lonMin + 6.5, lon);
        const eastFade = 1.0 - smoothstep(lonMax - 7.5, lonMax, lon);
        const domainFade = latDomainFade * westFade * eastFade;

        const cj = Math.min(nLon - 2, Math.floor(fj / SUBDIV));
        const v = (fj - cj * SUBDIV) / SUBDIV;

        const v00 = data[ci]?.[cj];
        const v01 = data[ci]?.[cj + 1];
        const v10 = data[ci + 1]?.[cj];
        const v11 = data[ci + 1]?.[cj + 1];

        const isWater = (val: number | undefined) => val !== undefined && val > -100 && isFinite(val);
        const w00 = isWater(v00) ? 1.0 : 0.0;
        const w01 = isWater(v01) ? 1.0 : 0.0;
        const w10 = isWater(v10) ? 1.0 : 0.0;
        const w11 = isWater(v11) ? 1.0 : 0.0;

        const b00 = (1 - u) * (1 - v);
        const b01 = (1 - u) * v;
        const b10 = u * (1 - v);
        const b11 = u * v;

        const waterWeight = b00 * w00 + b01 * w01 + b10 * w10 + b11 * w11;
        const coastalFade = smoothstep(0.12, 0.78, waterWeight);
        const vertexAlpha = domainFade * coastalFade;

        const pos = latLonToXYZ(lat, lon, layerR);
        const vIdx = positions.length / 3;
        rowIndices.push(vIdx);

        positions.push(pos.x, pos.y, pos.z);
        alphas.push(vertexAlpha);
        latLons.push(lat, lon);

        if (waterWeight > 0.05) {
          const denom = b00 * w00 + b01 * w01 + b10 * w10 + b11 * w11;
          const weightedVal = (b00 * w00 * (v00 || 0) +
                               b01 * w01 * (v01 || 0) +
                               b10 * w10 * (v10 || 0) +
                               b11 * w11 * (v11 || 0)) / (denom || 1.0);

          let norm = (weightedVal - minV) / (maxV - minV || 1);
          if (scale === 'log') {
            const sMin = Math.max(0.01, minV > 0 ? minV : 0.01);
            const sMax = Math.max(sMin + 0.1, maxV);
            const sVal = Math.max(sMin, Math.min(sMax, weightedVal));
            norm = (Math.log(sVal) - Math.log(sMin)) / (Math.log(sMax) - Math.log(sMin));
          }

          const col = getPaletteColor(palette, norm, tempCol);
          colors.push(col.r, col.g, col.b);
        } else {
          colors.push(0, 0, 0);
        }
      }
      vertexIndexGrid.push(rowIndices);
    }

    for (let fi = 0; fi < nFineLat - 1; fi++) {
      for (let fj = 0; fj < nFineLon - 1; fj++) {
        const a = vertexIndexGrid[fi][fj];
        const b = vertexIndexGrid[fi][fj + 1];
        const c = vertexIndexGrid[fi + 1][fj];
        const d = vertexIndexGrid[fi + 1][fj + 1];

        const aA = alphas[a], bA = alphas[b], cA = alphas[c], dA = alphas[d];

        if (aA > 0.005 && cA > 0.005 && bA > 0.005) {
          indices.push(a, c, b);
        }
        if (bA > 0.005 && cA > 0.005 && dA > 0.005) {
          indices.push(b, c, d);
        }
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));
    geom.setAttribute('aAlpha',   new THREE.Float32BufferAttribute(alphas, 1));
    geom.setAttribute('aLatLon',  new THREE.Float32BufferAttribute(latLons, 2));
    geom.setIndex(indices);
    if (positions.length > 0 && indices.length > 0) {
      geom.computeVertexNormals();
    }
    return geom;
  }, [gridData, variable, layerR, palette, scale, colorbarSettings?.vmin, colorbarSettings?.vmax]);

  // Compute 3D Isoline / Isotherm Contours
  const isolineSegments = useMemo(() => {
    if (!showIsoline || isolineTemp === undefined || !gridData.data || gridData.data.length < 2) return [];
    const segments: THREE.Vector3[][] = [];
    const isoVal = isolineTemp;
    for (let i = 0; i < lats.length; i++) {
      const row = data[i];
      if (!row) continue;
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j < lons.length - 1; j++) {
        const v1 = row[j];
        const v2 = row[j + 1];
        if (v1 > -100 && v2 > -100 && ((v1 <= isoVal && v2 >= isoVal) || (v1 >= isoVal && v2 <= isoVal))) {
          const frac = Math.abs(v2 - v1) > 0.001 ? (isoVal - v1) / (v2 - v1) : 0.5;
          const lon = lons[j] + frac * (lons[j + 1] - lons[j]);
          pts.push(latLonToXYZ(lats[i], lon, GLOBE_R + 0.08));
        }
      }
      if (pts.length >= 2) {
        segments.push(pts);
      }
    }
    return segments;
  }, [showIsoline, isolineTemp, gridData]);

  return (
    <group>
      <mesh geometry={geometry} material={shaderMaterial} />
      {showIsoline && isolineSegments.map((pts, idx) => (
        pts && pts.length >= 2 ? (
          <Line key={idx} points={pts} color="#00f0ff" lineWidth={2.5} dashed dashScale={1.5} />
        ) : null
      ))}
    </group>
  );
};

// ─── Current Streamlines & Interactive Hydrodynamic Overlays ──────────────────
export interface CurrentInfo {
  id: string;
  name: string;
  lat: number;
  lon: number;
  velocity: string;
  direction: string;
  dynamics: string;
  depthRange: string;
  seasonRegime: string;
}

export function getCurrentsData(timestamp: string): CurrentInfo[] {
  let month = 7;
  if (timestamp) {
    const parts = timestamp.split('-');
    if (parts.length >= 2) month = parseInt(parts[1], 10) || 7;
  }
  const isWinter = month <= 2 || month >= 11;

  return [
    {
      id: 'SEC',
      name: 'South Equatorial Current',
      lat: -12.0,
      lon: 75.0,
      velocity: '0.45 m/s',
      direction: 'Westward (270°)',
      dynamics: 'Broad, steady trans-oceanic wind-driven current driven by SE trade winds.',
      depthRange: '0 – 200m',
      seasonRegime: 'Perennial (Year-round)',
    },
    {
      id: 'ECC',
      name: isWinter ? 'Equatorial Countercurrent' : 'Southwest Monsoon Current',
      lat: 1.5,
      lon: 72.0,
      velocity: isWinter ? '0.35 m/s' : '0.85 m/s',
      direction: 'Eastward (090°)',
      dynamics: 'Strong eastward flow peaking during inter-monsoon Wyrtki jet phases.',
      depthRange: '0 – 150m',
      seasonRegime: isWinter ? 'NE Monsoon Flow' : 'SW Monsoon Jet',
    },
    {
      id: 'SOMALI',
      name: 'Somali Boundary Current',
      lat: 8.5,
      lon: 51.5,
      velocity: isWinter ? '0.40 m/s (Southward)' : '1.85 m/s (Northward)',
      direction: isWinter ? 'Southward (185°)' : 'Northward (025°)',
      dynamics: isWinter
        ? 'Reverses completely during winter NE monsoon into a moderate southward coastal current.'
        : 'World’s most intense open ocean western boundary current with severe coastal upwelling.',
      depthRange: '0 – 350m',
      seasonRegime: isWinter ? 'NE Monsoon (Reversed Flow)' : 'SW Monsoon (Intense Upwelling)',
    },
    {
      id: 'EICC',
      name: 'East India Coastal Current',
      lat: 12.0,
      lon: 82.0,
      velocity: isWinter ? '0.55 m/s' : '0.30 m/s',
      direction: isWinter ? 'Southward along coast' : 'Northward along coast',
      dynamics: 'Western boundary current of Bay of Bengal reflecting local wind stress curl.',
      depthRange: '0 – 120m',
      seasonRegime: isWinter ? 'NE Monsoon (Winter Flow)' : 'SW Monsoon (Summer Flow)',
    },
  ];
}

const CurrentStreamlines: React.FC<{ timestamp?: string }> = ({ timestamp = '' }) => {
  const lineRefs = useRef<(any)[]>([]);
  const R = GLOBE_R + 0.13;

  const lines = useMemo(() => {
    let month = 7;
    if (timestamp) {
      const parts = timestamp.split('-');
      if (parts.length >= 2) month = parseInt(parts[1], 10) || 7;
    }
    const isWinter = month <= 2 || month >= 11;
    const paths: { pts: THREE.Vector3[]; color: string }[] = [];

    // South Equatorial Current — westward
    for (let lat = -22; lat <= -8; lat += 4) {
      const pts: THREE.Vector3[] = [];
      for (let lon = 108; lon >= 44; lon -= 3)
        pts.push(latLonToXYZ(lat + Math.sin(lon * 0.08) * 0.9, lon, R));
      paths.push({ pts, color: '#2DD4BF' });
    }

    // Equatorial Jet / Countercurrent — eastward
    for (let lat = 0; lat <= 2; lat += 1) {
      const pts: THREE.Vector3[] = [];
      for (let lon = 48; lon <= 106; lon += 3)
        pts.push(latLonToXYZ(lat + Math.cos(lon * 0.1) * 0.5, lon, R));
      paths.push({ pts, color: '#00F0FF' });
    }

    // Somali Boundary Current: Northward in summer, reverses Southward in winter!
    const somaliPts: THREE.Vector3[] = [];
    if (isWinter) {
      for (let lat = 15; lat >= -3; lat -= 1.5)
        somaliPts.push(latLonToXYZ(lat, 46.0 + Math.max(0, lat) * 0.65, R));
      paths.push({ pts: somaliPts, color: '#38BDF8' });
    } else {
      for (let lat = -5; lat <= 15; lat += 1.5)
        somaliPts.push(latLonToXYZ(lat, 46.0 + Math.max(0, lat) * 0.65, R));
      paths.push({ pts: somaliPts, color: '#20E3B2' });
    }

    // East India Coastal Current
    const eiccPts: THREE.Vector3[] = [];
    for (let lat = 14; lat >= 8; lat -= 1)
      eiccPts.push(latLonToXYZ(lat, 80.5 + (14 - lat) * 0.3, R));
    paths.push({ pts: eiccPts, color: '#2DD4BF' });

    return paths;
  }, [timestamp]);

  useFrame((_, delta) => {
    lineRefs.current.forEach((l) => {
      if (l && l.material && 'dashOffset' in l.material) {
        try {
          l.material.dashOffset -= delta * 1.4;
        } catch {
          // ignore transient material disposal
        }
      }
    });
  });

  return (
    <group>
      {lines.map(({ pts, color }, i) => (
        <Line
          key={i}
          ref={(el) => { lineRefs.current[i] = el; }}
          points={pts}
          color={color}
          lineWidth={1.8}
          transparent
          opacity={0.7}
          dashed
          dashScale={1.8}
          dashSize={0.8}
          gapSize={0.4}
        />
      ))}
    </group>
  );
};

// ─── Current Streamline Markers ───────────────────────────────────────────────
const CurrentMarkers: React.FC<{
  currents: CurrentInfo[];
  selectedId: string | null;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  showAllLabels: boolean;
  onSelect?: (c: CurrentInfo) => void;
}> = ({ currents, selectedId, hoveredId, setHoveredId, showAllLabels, onSelect }) => (
  <>
    {currents.map((c) => {
      const pos = latLonToXYZ(c.lat, c.lon, GLOBE_R + 0.20);
      const sel = selectedId === c.id;
      const hov = hoveredId === c.id;
      const showLabel = sel || hov || showAllLabels;

      return (
        <group key={c.id} position={pos.toArray()}>
          <group
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(c);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredId(c.id);
            }}
            onPointerOut={() => {
              setHoveredId(null);
            }}
          >
            <Sphere args={[0.35, 8, 8]}>
              <meshBasicMaterial visible={false} />
            </Sphere>
            <Sphere args={[sel ? 0.20 : hov ? 0.16 : 0.12, 12, 12]}>
              <meshBasicMaterial color={sel ? '#00f0ff' : hov ? '#2dd4bf' : '#0d9488'} />
            </Sphere>
            <Sphere args={[sel ? 0.32 : hov ? 0.26 : 0.18, 10, 10]}>
              <meshBasicMaterial
                color={sel ? '#00f0ff' : hov ? '#2dd4bf' : '#0d9488'}
                transparent
                opacity={sel ? 0.45 : hov ? 0.30 : 0.15}
                wireframe
              />
            </Sphere>
            {showLabel && (
              <Html distanceFactor={20} pointerEvents="none" zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
                <div
                  className={`font-mono px-2 py-1 rounded shadow-2xl whitespace-nowrap pointer-events-none transform -translate-x-1/2 -translate-y-9 transition-all ${
                    sel
                      ? 'bg-teal-950/95 text-teal-200 border-2 border-teal-400 font-black text-[11px] shadow-[0_0_15px_rgba(45,212,191,0.5)]'
                      : 'bg-[#031512]/95 text-teal-300 border border-teal-500/80 font-bold text-[10px] shadow-[0_0_10px_rgba(20,184,166,0.4)] backdrop-blur-sm'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                    <span>{c.name}</span>
                    <span className="text-gray-300 font-normal">· {c.velocity}</span>
                  </div>
                </div>
              </Html>
            )}
          </group>
        </group>
      );
    })}
  </>
);

// ─── Animated Argo Float Profiling Probe ───────────────────────────────────────
const AnimatedFloatProbe: React.FC<{ float: ArgoFloat; isSelected: boolean }> = ({ float, isSelected }) => {
  const probeRef = useRef<THREE.Group>(null);
  const depthTextRef = useRef<HTMLDivElement>(null);

  useFrame((state) => {
    if (!probeRef.current) return;
    const cycle = (Math.sin(state.clock.elapsedTime * 1.5) + 1) / 2;
    const currentR = (GLOBE_R + 0.18) - cycle * 0.65;
    const pos = latLonToXYZ(float.lat, float.lon, currentR);
    probeRef.current.position.copy(pos);

    if (depthTextRef.current) {
      depthTextRef.current.textContent = `${Math.round(cycle * 2000)}m Profiling`;
    }
  });

  return (
    <group ref={probeRef}>
      <Sphere args={[0.18, 12, 12]}>
        <meshBasicMaterial color="#FFE600" />
      </Sphere>
      {isSelected && (
        <Html distanceFactor={18} pointerEvents="none" zIndexRange={[120, 0]} style={{ pointerEvents: 'none' }}>
          <div
            ref={depthTextRef}
            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/90 text-yellow-300 border border-yellow-400 font-bold -translate-x-1/2 -translate-y-7 whitespace-nowrap shadow-lg"
          >
            0m Profiling
          </div>
        </Html>
      )}
    </group>
  );
};

// ─── Argo Markers ─────────────────────────────────────────────────────────────
const ArgoMarkers: React.FC<{
  floats: ArgoFloat[];
  selectedId: string | null;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  showAllLabels: boolean;
  onSelect: (f: ArgoFloat) => void;
}> = ({ floats, selectedId, hoveredId, setHoveredId, showAllLabels, onSelect }) => (
  <>
    {floats.map((f) => {
      const surf = latLonToXYZ(f.lat, f.lon, GLOBE_R + 0.17);
      const deep = latLonToXYZ(f.lat, f.lon, GLOBE_R - 0.45);
      const sel  = selectedId === f.float_id;
      const hov  = hoveredId === f.float_id;
      const showLabel = sel || hov || showAllLabels;

      return (
        <group key={f.float_id}>
          {/* Vertical CTD sounding line */}
          <Line
            points={[surf, deep]}
            color={sel ? '#FFE600' : hov ? '#34D399' : '#10B981'}
            lineWidth={sel ? 2.5 : hov ? 2.0 : 1.2}
            transparent
            opacity={sel ? 0.95 : hov ? 0.8 : 0.45}
          />

          {/* Animated Float Sounding Vehicle (shown when selected) */}
          {sel && <AnimatedFloatProbe float={f} isSelected={sel} />}

          <group
            position={surf.toArray()}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(f);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredId(f.float_id);
            }}
            onPointerOut={() => {
              setHoveredId(null);
            }}
          >
            <Sphere args={[0.35, 8, 8]}>
              <meshBasicMaterial visible={false} />
            </Sphere>

            <Sphere args={[sel ? 0.24 : hov ? 0.20 : 0.13, 16, 16]}>
              <meshBasicMaterial color={sel ? '#FFE600' : hov ? '#34D399' : '#10B981'} />
            </Sphere>

            <Sphere args={[sel ? 0.38 : hov ? 0.30 : 0.21, 12, 12]}>
              <meshBasicMaterial
                color={sel ? '#FFE600' : hov ? '#34D399' : '#10B981'}
                transparent
                opacity={sel ? 0.38 : hov ? 0.28 : 0.14}
                wireframe
              />
            </Sphere>

            {showLabel && (
              <Html distanceFactor={20} pointerEvents="none" zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
                <div
                  className={`font-mono px-2 py-1 rounded shadow-2xl whitespace-nowrap pointer-events-none transform -translate-x-1/2 -translate-y-9 transition-all ${
                    sel
                      ? 'bg-amber-950/95 text-amber-200 border-2 border-amber-400 font-black text-[11px] shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                      : 'bg-[#040e0c]/95 text-emerald-300 border border-emerald-500/80 font-bold text-[10px] shadow-[0_0_10px_rgba(16,185,129,0.4)] backdrop-blur-sm'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>WMO {f.wmo_id}</span>
                    {f.temp !== undefined && f.temp !== null && (
                      <span className="text-gray-300 font-normal">· {f.temp.toFixed(1)}°C</span>
                    )}
                  </div>
                </div>
              </Html>
            )}
          </group>
        </group>
      );
    })}
  </>
);

// ─── Animated Glider Flight Model ─────────────────────────────────────────────
const AnimatedGliderFlight: React.FC<{ glider: GliderMission }> = ({ glider }) => {
  const gliderRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!gliderRef.current || glider.transect.length < 2) return;
    const t = (state.clock.elapsedTime * 0.08) % 1.0;
    const segs = glider.transect.length - 1;
    const sFloat = t * segs;
    const sIdx = Math.min(segs - 1, Math.floor(sFloat));
    const frac = sFloat - sIdx;
    const [lat0, lon0] = glider.transect[sIdx];
    const [lat1, lon1] = glider.transect[sIdx + 1];
    const lat = lat0 + frac * (lat1 - lat0);
    const lon = lon0 + frac * (lon1 - lon0);
    const yoYo = (Math.sin(state.clock.elapsedTime * 2.5) + 1) / 2;
    const currentR = (GLOBE_R + 0.16) - yoYo * 0.35;
    const pos = latLonToXYZ(lat, lon, currentR);
    gliderRef.current.position.copy(pos);
  });

  return (
    <group ref={gliderRef}>
      <mesh>
        <coneGeometry args={[0.15, 0.34, 6]} />
        <meshBasicMaterial color="#00F0FF" />
      </mesh>
    </group>
  );
};

// ─── Glider Markers ───────────────────────────────────────────────────────────
const GliderMarkers: React.FC<{
  gliders: GliderMission[];
  selectedId: string | null;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  showAllLabels: boolean;
  onSelect?: (g: GliderMission) => void;
}> = ({ gliders, selectedId, hoveredId, setHoveredId, showAllLabels, onSelect }) => (
  <>
    {gliders.map((g) => {
      const pos = latLonToXYZ(g.lat, g.lon, GLOBE_R + 0.20);
      const sel = selectedId === g.glider_id;
      const hov = hoveredId === g.glider_id;
      const showLabel = sel || hov || showAllLabels;

      const transectPts = g.transect.map(([lat, lon]) =>
        latLonToXYZ(lat, lon, GLOBE_R + 0.10)
      );

      return (
        <group key={g.glider_id}>
          {transectPts.length > 1 && (
            <Line
              points={transectPts}
              color={sel ? '#38BDF8' : '#F59E0B'}
              lineWidth={sel ? 2.5 : hov ? 2.0 : 1.4}
              transparent
              opacity={sel ? 0.85 : hov ? 0.75 : 0.45}
            />
          )}

          {sel && <AnimatedGliderFlight glider={g} />}

          <group
            position={pos.toArray()}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(g);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredId(g.glider_id);
            }}
            onPointerOut={() => {
              setHoveredId(null);
            }}
          >
            <Sphere args={[0.35, 8, 8]}>
              <meshBasicMaterial visible={false} />
            </Sphere>

            <mesh rotation={[0, 0, 0]}>
              <coneGeometry args={[sel ? 0.16 : hov ? 0.14 : 0.11, sel ? 0.36 : hov ? 0.30 : 0.23, 8]} />
              <meshBasicMaterial color={sel ? '#00F0FF' : hov ? '#FDE047' : '#F59E0B'} />
            </mesh>
            <mesh rotation={[Math.PI, 0, 0]} position={[0, sel ? -0.18 : hov ? -0.15 : -0.11, 0]}>
              <coneGeometry args={[sel ? 0.16 : hov ? 0.14 : 0.11, sel ? 0.36 : hov ? 0.30 : 0.23, 8]} />
              <meshBasicMaterial color={sel ? '#00F0FF' : hov ? '#FDE047' : '#F59E0B'} />
            </mesh>
            <Sphere args={[sel ? 0.30 : hov ? 0.25 : 0.18, 10, 10]}>
              <meshBasicMaterial
                color={sel ? '#00F0FF' : hov ? '#FDE047' : '#F59E0B'}
                transparent
                opacity={sel ? 0.35 : hov ? 0.25 : 0.14}
                wireframe
              />
            </Sphere>

            {showLabel && (
              <Html distanceFactor={20} pointerEvents="none" zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
                <div
                  className={`font-mono px-2 py-1 rounded shadow-2xl whitespace-nowrap pointer-events-none transform -translate-x-1/2 -translate-y-9 transition-all ${
                    sel
                      ? 'bg-cyan-950/95 text-cyan-200 border-2 border-cyan-400 font-black text-[11px] shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                      : 'bg-[#181105]/95 text-amber-300 border border-amber-500/80 font-bold text-[10px] shadow-[0_0_10px_rgba(245,158,11,0.4)] backdrop-blur-sm'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rotate-45 bg-amber-400" />
                    <span>{g.glider_id.startsWith('GL-') ? g.glider_id : `GL-${g.glider_id}`}</span>
                    <span className="text-gray-300 font-normal">· {g.depth_max}m</span>
                  </div>
                </div>
              </Html>
            )}
          </group>
        </group>
      );
    })}
  </>
);

// ─── Animated Lagrangian SAR Survival Craft ──────────────────────────────────
const AnimatedDriftingCraft: React.FC<{ path: DriftWaypoint[] }> = ({ path }) => {
  const craftRef = useRef<THREE.Group>(null);
  const hoursRef = useRef<HTMLSpanElement>(null);
  const radiusRef = useRef<HTMLSpanElement>(null);

  useFrame((state) => {
    if (!craftRef.current || path.length < 2) return;
    const cycleDuration = 9.0;
    const t = (state.clock.elapsedTime % cycleDuration) / cycleDuration;
    const totalSegs = path.length - 1;
    const sFloat = t * totalSegs;
    const sIdx = Math.min(totalSegs - 1, Math.floor(sFloat));
    const frac = sFloat - sIdx;

    const p0 = path[sIdx];
    const p1 = path[sIdx + 1];

    const lat = p0.lat + frac * (p1.lat - p0.lat);
    const lon = p0.lon + frac * (p1.lon - p0.lon);
    const pos = latLonToXYZ(lat, lon, GLOBE_R + 0.28);
    craftRef.current.position.copy(pos);

    if (hoursRef.current) {
      hoursRef.current.textContent = `+${(t * totalSegs).toFixed(1)}h`;
    }
    if (radiusRef.current) {
      const rad = p0.search_radius_km + frac * (p1.search_radius_km - p0.search_radius_km);
      radiusRef.current.textContent = `±${rad.toFixed(1)}km`;
    }
  });

  return (
    <group ref={craftRef}>
      <Sphere args={[0.22, 16, 16]}>
        <meshBasicMaterial color="#FF3B00" />
      </Sphere>
      <Sphere args={[0.42, 12, 12]}>
        <meshBasicMaterial color="#FF6B35" transparent opacity={0.4} wireframe />
      </Sphere>
      <Html distanceFactor={18} pointerEvents="none" zIndexRange={[120, 0]} style={{ pointerEvents: 'none' }}>
        <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1e0804]/95 text-[#ff6b35] border border-[#ff6b35] font-black shadow-[0_0_15px_rgba(255,59,0,0.8)] -translate-x-1/2 -translate-y-8 whitespace-nowrap pointer-events-none flex items-center gap-1.5 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>SURVIVAL CRAFT DRIFT //</span>
          <span ref={hoursRef}>+0.0h</span>
          <span ref={radiusRef} className="text-white">±5.0km</span>
        </div>
      </Html>
    </group>
  );
};

// ─── Drift Path + SAR Cone ────────────────────────────────────────────────────
const DriftPath: React.FC<{ path: DriftWaypoint[] }> = ({ path }) => {
  if (path.length < 2) return null;
  const pts = path.map((p) => latLonToXYZ(p.lat, p.lon, GLOBE_R + 0.21));
  const origin = pts[0];
  const end = pts[pts.length - 1];
  const lastR = path[path.length - 1].search_radius_km;
  const totalHours = path.length - 1;

  const datumPts: THREE.Vector3[] = [];
  const segs = 36;
  const lastP = path[path.length - 1];
  const radiusDeg = lastR / 111.0;

  for (let i = 0; i <= segs; i++) {
    const angle = (i / segs) * Math.PI * 2;
    const cLat = lastP.lat + radiusDeg * Math.sin(angle);
    const cLon = lastP.lon + (radiusDeg / Math.cos(lastP.lat * Math.PI / 180)) * Math.cos(angle);
    datumPts.push(latLonToXYZ(cLat, cLon, GLOBE_R + 0.23));
  }

  return (
    <group>
      <Line points={pts} color="#FF6B35" lineWidth={3.2} />

      {pts.map((pt, i) => (
        <group key={i} position={pt.toArray()}>
          <Sphere args={[i === 0 || i === pts.length - 1 ? 0.20 : 0.09, 8, 8]}>
            <meshBasicMaterial color={i === 0 ? '#10B981' : i === pts.length - 1 ? '#EF4444' : '#FF6B35'} />
          </Sphere>
        </group>
      ))}

      {/* Animated survival craft drifting along the RK4 path */}
      <AnimatedDriftingCraft path={path} />

      {/* Start datum marker */}
      <group position={origin.toArray()}>
        <Sphere args={[0.26, 12, 12]}>
          <meshBasicMaterial color="#10B981" transparent opacity={0.35} wireframe />
        </Sphere>
        <Html distanceFactor={20} pointerEvents="none" zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
          <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/95 text-emerald-300 border border-emerald-500 font-black shadow-lg -translate-x-1/2 -translate-y-9 whitespace-nowrap pointer-events-none">
            START DATUM
          </div>
        </Html>
      </group>

      {/* Expanding SAR Probability Search Area */}
      <Line points={datumPts} color="#FF6B35" lineWidth={2.0} dashed dashScale={1.5} />
      <group position={end.toArray()}>
        <Sphere args={[0.32, 12, 12]}>
          <meshBasicMaterial color="#EF4444" transparent opacity={0.3} wireframe />
        </Sphere>
        <Html distanceFactor={18} pointerEvents="none" zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
          <div className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#0e0706]/95 text-[#ff6b35] border-2 border-[#ff6b35] font-black shadow-[0_0_20px_rgba(255,107,53,0.5)] -translate-x-1/2 -translate-y-16 whitespace-nowrap pointer-events-none">
            SAR DATUM (+{totalHours}h) · ±{lastR.toFixed(1)} km
          </div>
        </Html>
      </group>
    </group>
  );
};

// ─── Invisible Raycaster ──────────────────────────────────────────────────────
const RaycastSphere: React.FC<{
  driftMode: boolean;
  onMove: (c: { lat: number; lon: number } | null) => void;
  onClick: (lat: number, lon: number) => void;
}> = ({ driftMode, onMove, onClick }) => {
  function decode(pt: THREE.Vector3) {
    const n = pt.clone().normalize();
    const lat = Math.asin(THREE.MathUtils.clamp(n.y, -1, 1)) * (180 / Math.PI);
    let lon = Math.atan2(n.z, -n.x) * (180 / Math.PI) - 180;
    if (lon < -180) lon += 360;
    return { lat, lon };
  }

  return (
    <mesh
      onPointerMove={(e) => {
        e.stopPropagation();
        if (e.point) onMove(decode(e.point));
      }}
      onPointerOut={() => onMove(null)}
      onClick={(e) => {
        if (!driftMode) return;
        e.stopPropagation();
        if (e.point) {
          const { lat, lon } = decode(e.point);
          onClick(lat, lon);
        }
      }}
    >
      <sphereGeometry args={[GLOBE_R + 0.15, 48, 48]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────
export interface OceanGlobe3DProps {
  gridData:           GridData | null;
  floats:             ArgoFloat[];
  gliders:            GliderMission[];
  driftPath:          DriftWaypoint[];
  driftMode:          boolean;
  selectedFloatId:    string | null;
  selectedGliderId?:  string | null;
  selectedCurrentId?: string | null;
  variable:           string;
  depth:              number;
  timestamp?:         string;
  showFloats:         boolean;
  showGliders:        boolean;
  showCurrentVectors: boolean;
  showAllLabels?:     boolean;
  globeStyle?:        'photorealistic' | 'cartographic';
  colorbarSettings?:  ColorbBarSettings;
  showIsoline?:       boolean;
  isolineTemp?:       number;
  onSelectFloat:      (f: ArgoFloat) => void;
  onSelectGlider?:    (g: GliderMission) => void;
  onSelectCurrent?:   (c: CurrentInfo) => void;
  onDeselectFloat?:   () => void;
  onDeselectGlider?:  () => void;
  onDeselectCurrent?: () => void;
  onExpandGraph?:     () => void;
  onMapClick:         (lat: number, lon: number) => void;
  onCursorMove:       (coord: { lat: number; lon: number } | null) => void;
}

class ThreeErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: String(error) };
  }
  componentDidCatch(error: any, info: any) {
    console.error('ThreeErrorBoundary caught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <group>
          <ProceduralEarth />
        </group>
      );
    }
    return this.props.children;
  }
}

export const OceanGlobe3D: React.FC<OceanGlobe3DProps> = ({
  gridData, floats, gliders, driftPath, driftMode, selectedFloatId, selectedGliderId = null,
  selectedCurrentId = null, variable, depth = 0, timestamp = '', showFloats, showGliders, showCurrentVectors,
  showAllLabels = false,
  globeStyle = 'photorealistic',
  colorbarSettings,
  showIsoline = false,
  isolineTemp = 28,
  onSelectFloat, onSelectGlider, onSelectCurrent, onMapClick, onCursorMove,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const currents = useMemo(() => getCurrentsData(timestamp), [timestamp]);

  return (
    <div className="w-full h-full" style={{ cursor: driftMode ? 'crosshair' : 'grab' }}>
      <Canvas
        camera={{ position: [5.6, 5.0, -22.5], fov: 42 }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0, 0);
        }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#030710']} />
        <ambientLight intensity={1.1} />
        <directionalLight position={[8, 14, -20]}  intensity={1.5} />
        <directionalLight position={[-10, -6, 15]} intensity={0.5} />

        <Stars radius={130} depth={45} count={3200} factor={3} saturation={0} fade speed={0.5} />

        <OrbitControls makeDefault target={[0, 0, 0]} enableDamping dampingFactor={0.06} minDistance={11.5} maxDistance={38} rotateSpeed={0.7} />

        <ThreeErrorBoundary>
          {/* Earth Globe */}
          <EarthGlobe style={globeStyle} />

          {/* Ocean data overlay with live dynamic palette, opacity, depth scaling & isotherms */}
          {gridData && (
            <OceanLayer
              gridData={gridData}
              variable={variable}
              depth={depth}
              colorbarSettings={colorbarSettings}
              showIsoline={showIsoline}
              isolineTemp={isolineTemp}
            />
          )}

          {/* Current streamlines & markers with animated flow */}
          {showCurrentVectors && (
            <>
              <CurrentStreamlines timestamp={timestamp} />
              <CurrentMarkers
                currents={currents}
                selectedId={selectedCurrentId}
                hoveredId={hoveredId}
                setHoveredId={setHoveredId}
                showAllLabels={showAllLabels}
                onSelect={onSelectCurrent}
              />
            </>
          )}

          {/* Interaction sphere */}
          <RaycastSphere driftMode={driftMode} onMove={onCursorMove} onClick={onMapClick} />

          {/* Argo floats */}
          {showFloats && (
            <ArgoMarkers
              floats={floats}
              selectedId={selectedFloatId}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              showAllLabels={showAllLabels}
              onSelect={onSelectFloat}
            />
          )}

          {/* Glider missions */}
          {showGliders && (
            <GliderMarkers
              gliders={gliders}
              selectedId={selectedGliderId}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              showAllLabels={showAllLabels}
              onSelect={onSelectGlider}
            />
          )}

          {/* RK4 drift path with animated drifting survival craft */}
          <DriftPath path={driftPath} />
        </ThreeErrorBoundary>
      </Canvas>
    </div>
  );
};
