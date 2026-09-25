import * as THREE from 'three';

/**
 * Generates an original, high-resolution procedural Earth texture
 * with realistic continental landmasses, latitude/longitude graticules,
 * and bathymetric ocean depth shading. Zero external image dependencies.
 */
export function createProceduralEarthTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep Ocean Base with subtle bathymetric gradients
  const oceanGrad = ctx.createRadialGradient(
    width * 0.65, height * 0.5, 50,
    width * 0.65, height * 0.5, width * 0.6
  );
  oceanGrad.addColorStop(0, '#0c2742');   // Tropical ocean (Indian Ocean basin)
  oceanGrad.addColorStop(0.5, '#071829'); // Deep pelagic
  oceanGrad.addColorStop(1, '#030a12');   // Abyssal trench
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Helper to map lat/lon degrees into canvas x, y (Equirectangular Projection)
  const mapCoord = (lat: number, lon: number): [number, number] => {
    // lon: -180 to 180 -> 0 to width
    // lat: 90 to -90 -> 0 to height
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return [x, y];
  };

  // 2. Draw Major Continental Polygons (Precision Cartographic Outline)
  ctx.fillStyle = '#1b2d26';   // Deep continental landmass
  ctx.strokeStyle = '#2d4d3f'; // Coastline shelf
  ctx.lineWidth = 2;

  const drawPolygon = (coords: [number, number][]) => {
    if (coords.length < 3) return;
    ctx.beginPath();
    const [startX, startY] = mapCoord(coords[0][0], coords[0][1]);
    ctx.moveTo(startX, startY);
    for (let i = 1; i < coords.length; i++) {
      const [px, py] = mapCoord(coords[i][0], coords[i][1]);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // --- Indian Subcontinent & South Asia ---
  drawPolygon([
    [8.0, 77.5], [10.0, 76.0], [15.0, 73.8], [21.0, 72.5], [24.0, 68.5],
    [27.0, 68.0], [31.0, 74.0], [35.0, 76.0], [34.0, 80.0], [30.0, 82.0],
    [28.0, 88.0], [26.0, 92.0], [22.0, 91.0], [21.0, 87.0], [17.0, 82.5],
    [13.0, 80.3], [10.0, 79.8], [8.0, 77.5]
  ]);

  // Sri Lanka
  drawPolygon([
    [9.8, 80.2], [9.0, 81.0], [7.0, 81.8], [6.0, 80.5], [7.5, 79.8]
  ]);

  // --- African Continent ---
  drawPolygon([
    [37.0, 10.0], [36.0, 0.0], [32.0, -9.0], [21.0, -17.0], [15.0, -17.0],
    [11.0, -15.0], [5.0, -1.0], [4.0, 8.0], [-5.0, 12.0], [-15.0, 12.0],
    [-23.0, 14.0], [-34.5, 19.5], [-34.0, 26.0], [-25.0, 33.0], [-15.0, 40.5],
    [-4.0, 39.5], [5.0, 48.0], [11.5, 51.2], [12.0, 44.0], [15.0, 41.0],
    [22.0, 37.0], [30.0, 32.5], [32.0, 25.0], [37.0, 10.0]
  ]);

  // Madagascar
  drawPolygon([
    [-12.0, 49.3], [-15.0, 50.5], [-25.0, 47.0], [-25.5, 45.0], [-20.0, 44.0], [-13.0, 48.0]
  ]);

  // --- Arabian Peninsula ---
  drawPolygon([
    [12.5, 43.5], [14.5, 53.5], [22.5, 59.5], [25.0, 56.5], [24.0, 51.5],
    [30.0, 48.0], [30.0, 35.0], [22.0, 39.0], [13.0, 43.0]
  ]);

  // --- Southeast Asia & Indochina ---
  drawPolygon([
    [22.0, 92.0], [21.0, 97.0], [16.0, 98.0], [10.0, 98.5], [2.0, 103.5],
    [6.0, 102.0], [10.0, 104.0], [11.0, 109.0], [16.0, 108.0], [21.0, 108.0],
    [23.0, 105.0]
  ]);

  // Indonesia / Sumatra / Java
  drawPolygon([[5.5, 95.3], [3.0, 98.5], [-5.5, 105.5], [-4.5, 103.0], [0.0, 99.0]]);
  drawPolygon([[-6.0, 106.0], [-7.5, 110.0], [-8.5, 114.5], [-7.0, 112.0], [-6.0, 107.0]]);

  // --- Australia ---
  drawPolygon([
    [-11.0, 142.0], [-15.0, 145.0], [-24.0, 153.0], [-38.0, 147.0], [-38.0, 140.0],
    [-32.0, 132.0], [-35.0, 116.0], [-22.0, 114.0], [-15.0, 124.0], [-12.0, 131.0],
    [-11.0, 136.0]
  ]);

  // --- Rest of World (Eurasia North, Americas, Antarctica) for complete globe rendering ---
  // Western Europe & Russia
  drawPolygon([[36.0, -9.0], [43.0, -9.0], [48.0, -5.0], [54.0, 8.0], [55.0, 20.0], [45.0, 15.0], [36.0, -5.0]]);
  drawPolygon([[55.0, 20.0], [60.0, 30.0], [65.0, 60.0], [70.0, 90.0], [72.0, 130.0], [60.0, 140.0], [40.0, 120.0], [35.0, 100.0], [45.0, 50.0]]);
  // East Asia / China / Japan
  drawPolygon([[22.0, 108.0], [30.0, 122.0], [38.0, 119.0], [40.0, 124.0], [30.0, 105.0]]);
  // South America
  drawPolygon([[12.0, -72.0], [5.0, -52.0], [-6.0, -35.0], [-23.0, -42.0], [-54.0, -68.0], [-45.0, -75.0], [-15.0, -75.0], [0.0, -80.0], [10.0, -75.0]]);
  // North America
  drawPolygon([[25.0, -80.0], [30.0, -84.0], [28.0, -97.0], [20.0, -97.0], [15.0, -90.0], [8.0, -78.0], [20.0, -105.0], [32.0, -117.0], [48.0, -124.0], [60.0, -145.0], [60.0, -85.0], [44.0, -66.0], [35.0, -75.0]]);
  // Antarctica
  drawPolygon([[-65.0, -60.0], [-70.0, 0.0], [-66.0, 60.0], [-68.0, 120.0], [-72.0, 170.0], [-80.0, -150.0], [-75.0, -90.0]]);

  // 3. Cartographic Graticules (Latitude & Longitude Navigation Lines)
  ctx.strokeStyle = 'rgba(15, 110, 86, 0.25)'; // INCOIS Teal tint
  ctx.lineWidth = 1;

  // Parallels (every 30 degrees)
  for (let lat = -60; lat <= 60; lat += 30) {
    const [, y] = mapCoord(lat, 0);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  // Equator Highlight
  const [, eqY] = mapCoord(0, 0);
  ctx.strokeStyle = 'rgba(79, 219, 200, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, eqY);
  ctx.lineTo(width, eqY);
  ctx.stroke();

  // Meridians (every 30 degrees)
  ctx.strokeStyle = 'rgba(15, 110, 86, 0.25)';
  ctx.lineWidth = 1;
  for (let lon = -180; lon < 180; lon += 30) {
    const [x] = mapCoord(0, lon);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // 4. Highlight the Indian Ocean Operating Sector with an atmospheric glow
  const [ioMinX, ioMaxY] = mapCoord(-30, 40);
  const [ioMaxX, ioMinY] = mapCoord(25, 110);
  const ioWidth = ioMaxX - ioMinX;
  const ioHeight = ioMaxY - ioMinY;

  ctx.strokeStyle = 'rgba(20, 184, 166, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(ioMinX, ioMinY, ioWidth, ioHeight);
  ctx.setLineDash([]);

  // Create Three.js Canvas Texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}
