import * as THREE from 'three';

export interface ProceduralTextureSet {
  cobbleMap: THREE.CanvasTexture;
  cobbleNormal: THREE.DataTexture;
  asphaltMap: THREE.CanvasTexture;
  asphaltNormal: THREE.DataTexture;
  asphaltRoughness: THREE.CanvasTexture;
  stuccoNormal: THREE.DataTexture;
  blockNormal: THREE.DataTexture;
  tileNormal: THREE.DataTexture;
  concreteRoughness: THREE.CanvasTexture;
  rickshawHoodMap: THREE.CanvasTexture;
  rickshawHoodNormal: THREE.DataTexture;
  terracottaTileMap: THREE.CanvasTexture;
  saloonTileMap: THREE.CanvasTexture;
  pharmacyTileMap: THREE.CanvasTexture;
  garageFloorMap: THREE.CanvasTexture;
  sidewalkMap: THREE.CanvasTexture;
  grassMap: THREE.CanvasTexture;
  tinBump: THREE.CanvasTexture;
  tinNormal: THREE.DataTexture;
  wallBrickMap: THREE.CanvasTexture;
  wallBrickNormal: THREE.DataTexture;
  chaWallMap: THREE.CanvasTexture;
  garageWallMap: THREE.CanvasTexture;
  descoWallMap: THREE.CanvasTexture;
  dishWallMap: THREE.CanvasTexture;
  saloonWallMap: THREE.CanvasTexture;
  pharmacyWallMap: THREE.CanvasTexture;
  alleyStuccoMap: THREE.CanvasTexture;
  crateWoodMap: THREE.CanvasTexture;
  crateWoodNormal: THREE.DataTexture;
  burlapSackMap: THREE.CanvasTexture;
  waterMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  addaSignMap: THREE.CanvasTexture;
  pukurSignMap: THREE.CanvasTexture;
  bazarSignMap: THREE.CanvasTexture;
  eidgahSignMap: THREE.CanvasTexture;
  wasaSignMap: THREE.CanvasTexture;
  chaSignMap: THREE.CanvasTexture;
  chaMenuMap: THREE.CanvasTexture;
  rickshawSignMap: THREE.CanvasTexture;
  descoSignMap: THREE.CanvasTexture;
  dishSignMap: THREE.CanvasTexture;
  rickshawArtMap: THREE.CanvasTexture;
  posterMaps: [THREE.CanvasTexture, THREE.CanvasTexture];
  saloonPosterMap: THREE.CanvasTexture;
  alponaMap: THREE.CanvasTexture;
  bazarAwningMap: THREE.CanvasTexture;
  fuchkaSignMap: THREE.CanvasTexture;
  saloonSignMap: THREE.CanvasTexture;
  cricketSignMap: THREE.CanvasTexture;
  scoreboardMap: THREE.CanvasTexture;
  pharmacySignMap: THREE.CanvasTexture;
  pandalSignMap: THREE.CanvasTexture;
  kakaWallMap: THREE.CanvasTexture;
  masterWallMap: THREE.CanvasTexture;
  chachaWallMap: THREE.CanvasTexture;
  khalaWallMap: THREE.CanvasTexture;
  kakaSignMap: THREE.CanvasTexture;
  masterSignMap: THREE.CanvasTexture;
  chachaSignMap: THREE.CanvasTexture;
  khalaSignMap: THREE.CanvasTexture;
  railStationSignMap: THREE.CanvasTexture;
  cricketTurfMap: THREE.CanvasTexture;
  nanaWallMap: THREE.CanvasTexture;
  cinemaWallMap: THREE.CanvasTexture;
  bhaiWallMap: THREE.CanvasTexture;
  coachingWallMap: THREE.CanvasTexture;
  khaluWallMap: THREE.CanvasTexture;
  kacchiWallMap: THREE.CanvasTexture;
  cyberWallMap: THREE.CanvasTexture;
  dorjiWallMap: THREE.CanvasTexture;
  gymWallMap: THREE.CanvasTexture;
  colonyWallMap: THREE.CanvasTexture;
  fufuWallMap: THREE.CanvasTexture;
  nanaSignMap: THREE.CanvasTexture;
  cinemaSignMap: THREE.CanvasTexture;
  bhaiSignMap: THREE.CanvasTexture;
  coachingSignMap: THREE.CanvasTexture;
  khaluSignMap: THREE.CanvasTexture;
  jheelSignMap: THREE.CanvasTexture;
  parkSignMap: THREE.CanvasTexture;
  kacchiSignMap: THREE.CanvasTexture;
  cyberSignMap: THREE.CanvasTexture;
  dorjiSignMap: THREE.CanvasTexture;
  gymSignMap: THREE.CanvasTexture;
  machSignMap: THREE.CanvasTexture;
  colonySignMap: THREE.CanvasTexture;
  signalSignMap: THREE.CanvasTexture;
  fufuSignMap: THREE.CanvasTexture;
  hoardingGgMap: THREE.CanvasTexture;
  hoardingKacchiMap: THREE.CanvasTexture;
  hoardingRailMap: THREE.CanvasTexture;
  hoardingAdMap: THREE.CanvasTexture;
  gantryNorthMap: THREE.CanvasTexture;
  gantrySouthMap: THREE.CanvasTexture;
  dispose: () => void;
}

function heightCanvasToNormalMap(
  canvas: HTMLCanvasElement,
  strength: number,
  repeatX: number,
  repeatY: number,
  maxAniso: number,
): THREE.DataTexture {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;
  const src = ctx.getImageData(0, 0, w, h).data;
  const dst = new Uint8Array(w * h * 4);

  const sample = (x: number, y: number): number => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dX = tr + 2 * r + br - (tl + 2 * l + bl);
      const dY = bl + 2 * b + br - (tl + 2 * t + tr);

      let nx = -dX * strength;
      let ny = -dY * strength;
      let nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(dst, w, h, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  baseSizePx: number,
  fontWeight: string | number,
  fontFamily: string,
  minSizePx = 14,
): void {
  let size = baseSizePx;
  while (size > minSizePx) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
  ctx.fillText(text, x, y, maxWidth);
}

export type TextureQualityMode = 'low' | 'medium' | 'high';

function resolveQualityMode(quality: boolean | TextureQualityMode): TextureQualityMode {
  if (quality === true) return 'low';
  if (quality === false) return 'high';
  return quality;
}

function makeSignTexture(
  title: string,
  subtitle: string,
  bgHex: string,
  accentHex: string,
  maxAnisotropy: number,
  quality: boolean | TextureQualityMode = false,
): THREE.CanvasTexture {
  const mode = resolveQualityMode(quality);
  const scale: number = mode === 'low' ? 0.6667 : mode === 'medium' ? 1 : 1.3334;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(768 * scale);
  canvas.height = Math.round(256 * scale);
  const ctx = canvas.getContext('2d')!;
  if (scale !== 1) ctx.scale(scale, scale);

  const grad = ctx.createLinearGradient(0, 0, 768, 256);
  grad.addColorStop(0, bgHex);
  grad.addColorStop(1, '#090f1d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 768, 256);

  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  for (let i = 0; i < 48; i++) {
    ctx.fillRect((i * 63) % 740, (i * 37) % 240, 22, 2);
  }

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 12;
  ctx.strokeRect(12, 12, 744, 232);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, 720, 208);

  // Corner mounting rivets
  ctx.fillStyle = accentHex;
  for (const [rx, ry] of [
    [34, 34],
    [734, 34],
    [34, 222],
    [734, 222],
  ]) {
    ctx.beginPath();
    ctx.arc(rx, ry, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#ffffff';
  drawFittedText(
    ctx,
    title,
    384,
    98,
    670,
    64,
    '800',
    '"Noto Sans Bengali", "Bricolage Grotesque", sans-serif',
    28,
  );

  ctx.shadowBlur = 4;
  ctx.fillStyle = accentHex;
  drawFittedText(
    ctx,
    subtitle,
    384,
    176,
    660,
    30,
    '600',
    '"Noto Sans Bengali", "Plus Jakarta Sans", sans-serif',
    16,
  );
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function makePosterTexture(
  banglaLine: string,
  subLine: string,
  paperHex: string,
  inkHex: string,
  maxAnisotropy: number,
  quality: boolean | TextureQualityMode = false,
): THREE.CanvasTexture {
  const mode = resolveQualityMode(quality);
  const scale = mode === 'low' ? 1 : mode === 'medium' ? 1.5 : 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(256 * scale);
  canvas.height = Math.round(320 * scale);
  const ctx = canvas.getContext('2d')!;
  if (scale !== 1) ctx.scale(scale, scale);

  ctx.fillStyle = paperHex;
  ctx.fillRect(0, 0, 256, 320);

  ctx.strokeStyle = inkHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(14, 14, 228, 292);

  ctx.fillStyle = inkHex;
  ctx.fillRect(26, 28, 204, 56);

  ctx.fillStyle = paperHex;
  ctx.font = 'bold 26px "Noto Sans Bengali", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('জরুরি বিজ্ঞপ্তি', 128, 56);

  ctx.fillStyle = '#0f172a';
  drawFittedText(ctx, banglaLine, 128, 148, 206, 26, '800', '"Noto Sans Bengali", sans-serif', 16);

  ctx.fillStyle = inkHex;
  drawFittedText(ctx, subLine, 128, 212, 204, 21, '700', '"Noto Sans Bengali", sans-serif', 14);

  ctx.fillStyle = 'rgba(15,23,42,0.16)';
  ctx.fillRect(36, 252, 184, 26);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function makeHoardingTexture(
  headline: string,
  tagline: string,
  badge: string,
  bgTopHex: string,
  bgBottomHex: string,
  accentHex: string,
  maxAnisotropy: number,
  quality: boolean | TextureQualityMode = false,
): THREE.CanvasTexture {
  const mode = resolveQualityMode(quality);
  const scale: number = mode === 'low' ? 0.5 : mode === 'medium' ? 1 : 1.5;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(1024 * scale);
  canvas.height = Math.round(512 * scale);
  const ctx = canvas.getContext('2d')!;
  if (scale !== 1) ctx.scale(scale, scale);

  const grad = ctx.createLinearGradient(0, 0, 1024, 512);
  grad.addColorStop(0, bgTopHex);
  grad.addColorStop(1, bgBottomHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Diagonal tactical accent stripes
  ctx.save();
  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.14;
  for (let i = -512; i < 1280; i += 88) {
    ctx.beginPath();
    ctx.moveTo(i, 512);
    ctx.lineTo(i + 44, 512);
    ctx.lineTo(i + 300, 0);
    ctx.lineTo(i + 256, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 18;
  ctx.strokeRect(14, 14, 996, 484);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, 964, 452);

  // Top-left promo badge
  ctx.fillStyle = accentHex;
  ctx.fillRect(52, 50, 320, 68);
  ctx.fillStyle = '#090f1d';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  drawFittedText(ctx, badge, 212, 85, 290, 32, '800', '"Noto Sans Bengali", sans-serif', 20);

  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffffff';
  drawFittedText(
    ctx,
    headline,
    512,
    250,
    900,
    80,
    '800',
    '"Noto Sans Bengali", "Bricolage Grotesque", sans-serif',
    36,
  );

  ctx.shadowBlur = 8;
  ctx.fillStyle = accentHex;
  drawFittedText(
    ctx,
    tagline,
    512,
    384,
    880,
    40,
    '700',
    '"Noto Sans Bengali", "Plus Jakarta Sans", sans-serif',
    22,
  );
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function makeGantryBannerTexture(
  mainText: string,
  subText: string,
  bgHex: string,
  accentHex: string,
  maxAnisotropy: number,
  quality: boolean | TextureQualityMode = false,
): THREE.CanvasTexture {
  const mode = resolveQualityMode(quality);
  const scale: number = mode === 'low' ? 0.5 : mode === 'medium' ? 1 : 1.5;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(1024 * scale);
  canvas.height = Math.round(224 * scale);
  const ctx = canvas.getContext('2d')!;
  if (scale !== 1) ctx.scale(scale, scale);

  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0, '#090f1d');
  grad.addColorStop(0.5, bgHex);
  grad.addColorStop(1, '#090f1d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 224);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 12;
  ctx.strokeRect(10, 10, 1004, 204);

  ctx.fillStyle = accentHex;
  ctx.fillRect(30, 30, 18, 164);
  ctx.fillRect(976, 30, 18, 164);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffffff';
  drawFittedText(
    ctx,
    mainText,
    512,
    84,
    890,
    56,
    '800',
    '"Noto Sans Bengali", "Bricolage Grotesque", sans-serif',
    28,
  );

  ctx.shadowBlur = 4;
  ctx.fillStyle = accentHex;
  drawFittedText(
    ctx,
    subText,
    512,
    158,
    880,
    30,
    '700',
    '"Noto Sans Bengali", "Plus Jakarta Sans", sans-serif',
    18,
  );
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createProceduralTextures(
  renderer: THREE.WebGLRenderer,
  maxAnisotropyCap = 16,
  quality: boolean | TextureQualityMode = false,
): ProceduralTextureSet {
  const qualityMode = resolveQualityMode(quality);
  const compactMode = qualityMode;
  const maxAniso = Math.max(1, Math.min(renderer.capabilities.getMaxAnisotropy(), maxAnisotropyCap));
  const tileScale: number = qualityMode === 'low' ? 0.5 : qualityMode === 'medium' ? 1 : 2;
  const tilePx = Math.round(512 * tileScale);
  const subScale = qualityMode === 'low' ? 1 : qualityMode === 'medium' ? 1.5 : 2;
  const subPx = Math.round(256 * subScale);

  // 1. High-Detail Stone Cobble Albedo + Tangent Normal Map
  const cobbleCanvas = document.createElement('canvas');
  cobbleCanvas.width = tilePx;
  cobbleCanvas.height = tilePx;
  const cCtx = cobbleCanvas.getContext('2d')!;
  if (tileScale !== 1) cCtx.scale(tileScale, tileScale);
  cCtx.fillStyle = '#333d4f';
  cCtx.fillRect(0, 0, 512, 512);

  const cobbleHeightCanvas = document.createElement('canvas');
  cobbleHeightCanvas.width = tilePx;
  cobbleHeightCanvas.height = tilePx;
  const cbCtx = cobbleHeightCanvas.getContext('2d')!;
  if (tileScale !== 1) cbCtx.scale(tileScale, tileScale);
  cbCtx.fillStyle = '#242424';
  cbCtx.fillRect(0, 0, 512, 512);

  const rows = 12;
  const cols = 6;
  const bh = 512 / rows;
  const bw = 512 / cols;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (bw / 2);
    for (let c = -1; c <= cols; c++) {
      const shade = 78 + ((r * 7 + c * 13) % 28);
      cCtx.fillStyle = `rgb(${shade + 14}, ${shade + 18}, ${shade + 26})`;
      cCtx.fillRect(c * bw + offset + 3, r * bh + 3, bw - 6, bh - 6);
      cCtx.fillStyle = 'rgba(255,255,255,0.12)';
      cCtx.fillRect(c * bw + offset + 4, r * bh + 4, bw - 8, 4);

      const hv = 190 + ((r * 3 + c * 5) % 45);
      cbCtx.fillStyle = `rgb(${hv}, ${hv}, ${hv})`;
      cbCtx.fillRect(c * bw + offset + 4, r * bh + 4, bw - 8, bh - 8);
    }
  }

  const cobbleMap = new THREE.CanvasTexture(cobbleCanvas);
  cobbleMap.colorSpace = THREE.SRGBColorSpace;
  cobbleMap.wrapS = cobbleMap.wrapT = THREE.RepeatWrapping;
  cobbleMap.repeat.set(12, 12);
  cobbleMap.anisotropy = maxAniso;

  const cobbleNormal = heightCanvasToNormalMap(cobbleHeightCanvas, 2.2, 12, 12, maxAniso);

  // 2. Seamless Mineral Tarmac Asphalt + Aggregate Micro-Normal + Matte/Worn Roughness Map
  const aspCanvas = document.createElement('canvas');
  aspCanvas.width = tilePx;
  aspCanvas.height = tilePx;
  const aCtx = aspCanvas.getContext('2d')!;
  if (tileScale !== 1) aCtx.scale(tileScale, tileScale);
  aCtx.fillStyle = '#2c313a';
  aCtx.fillRect(0, 0, 512, 512);

  const aspHeightCanvas = document.createElement('canvas');
  aspHeightCanvas.width = tilePx;
  aspHeightCanvas.height = tilePx;
  const ahCtx = aspHeightCanvas.getContext('2d')!;
  if (tileScale !== 1) ahCtx.scale(tileScale, tileScale);
  ahCtx.fillStyle = '#808080';
  ahCtx.fillRect(0, 0, 512, 512);

  const aspRoughCanvas = document.createElement('canvas');
  aspRoughCanvas.width = tilePx;
  aspRoughCanvas.height = tilePx;
  const arCtx = aspRoughCanvas.getContext('2d')!;
  if (tileScale !== 1) arCtx.scale(tileScale, tileScale);
  arCtx.fillStyle = '#dcdcdc';
  arCtx.fillRect(0, 0, 512, 512);

  let seed = 1337;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Subtle longitudinal tire wear lanes (continuous, never circular blotches)
  const laneGradL = aCtx.createLinearGradient(80, 0, 200, 0);
  laneGradL.addColorStop(0, 'rgba(26, 30, 38, 0)');
  laneGradL.addColorStop(0.5, 'rgba(20, 24, 30, 0.24)');
  laneGradL.addColorStop(1, 'rgba(26, 30, 38, 0)');
  aCtx.fillStyle = laneGradL;
  aCtx.fillRect(80, 0, 120, 512);

  const laneGradR = aCtx.createLinearGradient(312, 0, 432, 0);
  laneGradR.addColorStop(0, 'rgba(26, 30, 38, 0)');
  laneGradR.addColorStop(0.5, 'rgba(20, 24, 30, 0.24)');
  laneGradR.addColorStop(1, 'rgba(26, 30, 38, 0)');
  aCtx.fillStyle = laneGradR;
  aCtx.fillRect(312, 0, 120, 512);

  // Subtle bitumen tar-patch & expansion joint lines
  aCtx.strokeStyle = 'rgba(15, 18, 24, 0.42)';
  aCtx.lineWidth = 2;
  aCtx.beginPath();
  aCtx.moveTo(0, 256);
  aCtx.bezierCurveTo(170, 252, 340, 260, 512, 256);
  aCtx.stroke();

  // Multi-scale crushed basalt & quartz mineral aggregate speckles + roughness variation
  const speckleCount = qualityMode === 'low' ? 8000 : qualityMode === 'medium' ? 16000 : 28000;
  const speckleSize = qualityMode === 'low' ? 2 : 1;
  for (let i = 0; i < speckleCount; i++) {
    const x = Math.floor(nextRand() * 512);
    const y = Math.floor(nextRand() * 512);
    const rRoll = nextRand();
    const baseTone = rRoll > 0.88 ? 68 + Math.floor(nextRand() * 24) : 34 + Math.floor(nextRand() * 22);
    aCtx.fillStyle = `rgb(${baseTone}, ${baseTone + 2}, ${baseTone + 5})`;
    aCtx.fillRect(x, y, speckleSize, speckleSize);

    const bv = 94 + Math.floor(nextRand() * 68);
    ahCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    ahCtx.fillRect(x, y, speckleSize, speckleSize);

    const rv = 185 + Math.floor(nextRand() * 55);
    arCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
    arCtx.fillRect(x, y, speckleSize + 1, speckleSize + 1);
  }

  // Slight tire-polish lower roughness along wheel tracks (matte 0.88 -> satin 0.72)
  arCtx.fillStyle = 'rgba(182, 182, 182, 0.35)';
  arCtx.fillRect(108, 0, 64, 512);
  arCtx.fillRect(340, 0, 64, 512);

  const asphaltMap = new THREE.CanvasTexture(aspCanvas);
  asphaltMap.colorSpace = THREE.SRGBColorSpace;
  asphaltMap.wrapS = asphaltMap.wrapT = THREE.RepeatWrapping;
  asphaltMap.repeat.set(8, 8);
  asphaltMap.anisotropy = maxAniso;

  const asphaltNormal = heightCanvasToNormalMap(aspHeightCanvas, 1.35, 8, 8, maxAniso);

  const asphaltRoughness = new THREE.CanvasTexture(aspRoughCanvas);
  asphaltRoughness.colorSpace = THREE.NoColorSpace;
  asphaltRoughness.wrapS = asphaltRoughness.wrapT = THREE.RepeatWrapping;
  asphaltRoughness.repeat.set(8, 8);
  asphaltRoughness.anisotropy = maxAniso;

  // 2b. Hand-laid Terracotta Verandah Tile Map
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = subPx;
  tileCanvas.height = subPx;
  const ttCtx = tileCanvas.getContext('2d')!;
  if (subScale !== 1) ttCtx.scale(subScale, subScale);
  ttCtx.fillStyle = '#3b2c26';
  ttCtx.fillRect(0, 0, 256, 256);
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const shade = 92 + ((tx * 13 + ty * 19) % 24);
      ttCtx.fillStyle = `rgb(${shade + 35}, ${Math.round(shade * 0.78)}, ${Math.round(shade * 0.62)})`;
      ttCtx.fillRect(tx * 64 + 3, ty * 64 + 3, 58, 58);
      ttCtx.strokeStyle = 'rgba(255,228,196,0.14)';
      ttCtx.lineWidth = 2;
      ttCtx.strokeRect(tx * 64 + 5, ty * 64 + 5, 54, 54);
    }
  }
  const terracottaTileMap = new THREE.CanvasTexture(tileCanvas);
  terracottaTileMap.colorSpace = THREE.SRGBColorSpace;
  terracottaTileMap.wrapS = terracottaTileMap.wrapT = THREE.RepeatWrapping;
  terracottaTileMap.repeat.set(5, 5);
  terracottaTileMap.anisotropy = maxAniso;

  // 2b-2. Checkerboard Barber Saloon Mosaic Floor
  const salTileCanvas = document.createElement('canvas');
  salTileCanvas.width = subPx;
  salTileCanvas.height = subPx;
  const stCtx = salTileCanvas.getContext('2d')!;
  if (subScale !== 1) stCtx.scale(subScale, subScale);
  for (let sy = 0; sy < 4; sy++) {
    for (let sx = 0; sx < 4; sx++) {
      const isEven = (sx + sy) % 2 === 0;
      stCtx.fillStyle = isEven ? '#e2e8f0' : '#334155';
      stCtx.fillRect(sx * 64, sy * 64, 64, 64);
      stCtx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
      stCtx.lineWidth = 2;
      stCtx.strokeRect(sx * 64 + 1, sy * 64 + 1, 62, 62);
    }
  }
  const saloonTileMap = new THREE.CanvasTexture(salTileCanvas);
  saloonTileMap.colorSpace = THREE.SRGBColorSpace;
  saloonTileMap.wrapS = saloonTileMap.wrapT = THREE.RepeatWrapping;
  saloonTileMap.repeat.set(6, 6);
  saloonTileMap.anisotropy = maxAniso;

  // 2b-3. Clean Clinical Pharmacy Porcelain Tile Floor
  const phTileCanvas = document.createElement('canvas');
  phTileCanvas.width = subPx;
  phTileCanvas.height = subPx;
  const ptCtx = phTileCanvas.getContext('2d')!;
  if (subScale !== 1) ptCtx.scale(subScale, subScale);
  ptCtx.fillStyle = '#cbd5e1';
  ptCtx.fillRect(0, 0, 256, 256);
  for (let py = 0; py < 4; py++) {
    for (let px = 0; px < 4; px++) {
      ptCtx.fillStyle = (px + py) % 2 === 0 ? '#f1f5f9' : '#e0f2fe';
      ptCtx.fillRect(px * 64 + 2, py * 64 + 2, 60, 60);
    }
  }
  const pharmacyTileMap = new THREE.CanvasTexture(phTileCanvas);
  pharmacyTileMap.colorSpace = THREE.SRGBColorSpace;
  pharmacyTileMap.wrapS = pharmacyTileMap.wrapT = THREE.RepeatWrapping;
  pharmacyTileMap.repeat.set(6, 6);
  pharmacyTileMap.anisotropy = maxAniso;

  // 2b-4. Oil-Stained Concrete Garage Floor
  const garCanvas = document.createElement('canvas');
  garCanvas.width = subPx;
  garCanvas.height = subPx;
  const grCtx = garCanvas.getContext('2d')!;
  if (subScale !== 1) grCtx.scale(subScale, subScale);
  grCtx.fillStyle = '#334155';
  grCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    const gx = Math.floor(nextRand() * 256);
    const gy = Math.floor(nextRand() * 256);
    const shade = 45 + Math.floor(nextRand() * 25);
    grCtx.fillStyle = `rgb(${shade},${shade + 6},${shade + 12})`;
    grCtx.fillRect(gx, gy, 2, 2);
  }
  for (let s = 0; s < 3; s++) {
    const sx = 50 + nextRand() * 156;
    const sy = 50 + nextRand() * 156;
    const g = grCtx.createRadialGradient(sx, sy, 2, sx, sy, 28);
    g.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
    g.addColorStop(1, 'rgba(15, 23, 42, 0)');
    grCtx.fillStyle = g;
    grCtx.beginPath();
    grCtx.arc(sx, sy, 28, 0, Math.PI * 2);
    grCtx.fill();
  }
  grCtx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
  grCtx.lineWidth = 4;
  grCtx.strokeRect(4, 4, 248, 248);
  const garageFloorMap = new THREE.CanvasTexture(garCanvas);
  garageFloorMap.colorSpace = THREE.SRGBColorSpace;
  garageFloorMap.wrapS = garageFloorMap.wrapT = THREE.RepeatWrapping;
  garageFloorMap.repeat.set(4, 4);
  garageFloorMap.anisotropy = maxAniso;

  // 2b-5. Sidewalk Interlocking Kerb Brick Map
  const swCanvas = document.createElement('canvas');
  swCanvas.width = subPx;
  swCanvas.height = subPx;
  const swCtx = swCanvas.getContext('2d')!;
  if (subScale !== 1) swCtx.scale(subScale, subScale);
  swCtx.fillStyle = '#475569';
  swCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 4; x++) {
      const off = (y % 2) * 32;
      swCtx.fillStyle = (x + y) % 2 === 0 ? '#64748b' : '#94a3b8';
      swCtx.fillRect((x * 64 + off) % 256 + 2, y * 32 + 2, 58, 28);
    }
  }
  const sidewalkMap = new THREE.CanvasTexture(swCanvas);
  sidewalkMap.colorSpace = THREE.SRGBColorSpace;
  sidewalkMap.wrapS = sidewalkMap.wrapT = THREE.RepeatWrapping;
  sidewalkMap.repeat.set(24, 1);
  sidewalkMap.anisotropy = maxAniso;

  // 2c. Sunlit Moholla Variegated Lawn Grass Texture
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = subPx;
  grassCanvas.height = subPx;
  const gCtx = grassCanvas.getContext('2d')!;
  if (subScale !== 1) gCtx.scale(subScale, subScale);
  gCtx.fillStyle = '#2d6a3e';
  gCtx.fillRect(0, 0, 256, 256);
  for (let s = 0; s < 8; s++) {
    gCtx.fillStyle = s % 2 === 0 ? 'rgba(54, 128, 68, 0.42)' : 'rgba(34, 92, 48, 0.36)';
    gCtx.fillRect(s * 32, 0, 32, 256);
  }
  for (let p = 0; p < 10; p++) {
    const px = nextRand() * 256;
    const py = nextRand() * 256;
    const g = gCtx.createRadialGradient(px, py, 4, px, py, 34);
    g.addColorStop(0, p % 2 === 0 ? 'rgba(74, 152, 82, 0.25)' : 'rgba(38, 84, 42, 0.24)');
    g.addColorStop(1, 'rgba(45, 106, 62, 0)');
    gCtx.fillStyle = g;
    gCtx.beginPath();
    gCtx.arc(px, py, 34, 0, Math.PI * 2);
    gCtx.fill();
  }
  for (let b = 0; b < 2400; b++) {
    const gx = Math.floor(nextRand() * 256);
    const gy = Math.floor(nextRand() * 256);
    gCtx.fillStyle = nextRand() > 0.45 ? 'rgba(134, 210, 114, 0.22)' : 'rgba(22, 68, 36, 0.32)';
    gCtx.fillRect(gx, gy, 2, 3);
  }
  const grassMap = new THREE.CanvasTexture(grassCanvas);
  grassMap.colorSpace = THREE.SRGBColorSpace;
  grassMap.wrapS = grassMap.wrapT = THREE.RepeatWrapping;
  grassMap.repeat.set(4, 3);
  grassMap.anisotropy = maxAniso;

  // 3. Corrugated Tin Roof Bump & Normal Map
  const tinPx = Math.round(256 * subScale);
  const tinCanvas = document.createElement('canvas');
  tinCanvas.width = tinPx;
  tinCanvas.height = tinPx;
  const tCtx = tinCanvas.getContext('2d')!;
  if (subScale !== 1) tCtx.scale(subScale, subScale);
  const tinStep = qualityMode === 'low' ? 2 : qualityMode === 'medium' ? 1 : 0.5;
  const tinRectW = qualityMode === 'low' ? 2 : qualityMode === 'medium' ? 1.1 : 0.6;
  for (let x = 0; x < 256; x += tinStep) {
    const v = Math.round(128 + 115 * Math.sin((x / 256) * Math.PI * 24));
    tCtx.fillStyle = `rgb(${v},${v},${v})`;
    tCtx.fillRect(x, 0, tinRectW, 256);
  }
  const tinBump = new THREE.CanvasTexture(tinCanvas);
  tinBump.wrapS = tinBump.wrapT = THREE.RepeatWrapping;
  tinBump.repeat.set(5, 2);
  tinBump.anisotropy = maxAniso;
  const tinNormal = heightCanvasToNormalMap(tinCanvas, 2.4, 5, 2, maxAniso);

  // 4. Weathered Dhaka Brick Wall Albedo + Deep Mortar Normal Map
  const wallCanvas = document.createElement('canvas');
  wallCanvas.width = tilePx;
  wallCanvas.height = tilePx;
  const wCtx = wallCanvas.getContext('2d')!;
  if (tileScale !== 1) wCtx.scale(tileScale, tileScale);
  wCtx.fillStyle = '#4e3127';
  wCtx.fillRect(0, 0, 512, 512);

  const wallHeightCanvas = document.createElement('canvas');
  wallHeightCanvas.width = tilePx;
  wallHeightCanvas.height = tilePx;
  const wbCtx = wallHeightCanvas.getContext('2d')!;
  if (tileScale !== 1) wbCtx.scale(tileScale, tileScale);
  wbCtx.fillStyle = '#202020';
  wbCtx.fillRect(0, 0, 512, 512);

  for (let r = 0; r < 14; r++) {
    const off = (r % 2) * 44;
    const brickH = 512 / 14;
    for (let c = -1; c < 7; c++) {
      const tone = 108 + ((r * 11 + c * 17) % 36);
      wCtx.fillStyle = `rgb(${tone + 46}, ${Math.round(tone * 0.65)}, ${Math.round(tone * 0.48)})`;
      wCtx.fillRect(c * 88 + off + 3, r * brickH + 3, 82, brickH - 6);

      const hv = 195 + ((r * 5 + c * 9) % 45);
      wbCtx.fillStyle = `rgb(${hv}, ${hv}, ${hv})`;
      wbCtx.fillRect(c * 88 + off + 4, r * brickH + 4, 80, brickH - 8);
    }
  }
  const mossGrad = wCtx.createLinearGradient(0, 360, 0, 512);
  mossGrad.addColorStop(0, 'rgba(18, 40, 26, 0)');
  mossGrad.addColorStop(1, 'rgba(18, 42, 28, 0.42)');
  wCtx.fillStyle = mossGrad;
  wCtx.fillRect(0, 360, 512, 152);

  const wallBrickMap = new THREE.CanvasTexture(wallCanvas);
  wallBrickMap.colorSpace = THREE.SRGBColorSpace;
  wallBrickMap.wrapS = wallBrickMap.wrapT = THREE.RepeatWrapping;
  wallBrickMap.repeat.set(4, 1);
  wallBrickMap.anisotropy = maxAniso;

  const wallBrickNormal = heightCanvasToNormalMap(wallHeightCanvas, 2.8, 4, 1, maxAniso);

  // 4a-2. Helper for Distinct Architectural Building Wall Textures (Plaster, Concrete Block, Steel, Glazed Tile)
  const makeBuildingWallTex = (
    topHex: string,
    midHex: string,
    dadoHex: string,
    stripeHex: string,
    mode: 'plaster' | 'blocks' | 'steel' | 'tiles' | 'stucco',
  ): THREE.CanvasTexture => {
    const cv = document.createElement('canvas');
    cv.width = subPx;
    cv.height = subPx;
    const cx = cv.getContext('2d')!;
    if (subScale !== 1) cx.scale(subScale, subScale);
    cx.fillStyle = midHex;
    cx.fillRect(0, 0, 256, 256);

    cx.fillStyle = topHex;
    cx.fillRect(0, 0, 256, 44);
    cx.fillStyle = dadoHex;
    cx.fillRect(0, 174, 256, 82);
    cx.fillStyle = stripeHex;
    cx.fillRect(0, 162, 256, 12);

    if (mode === 'blocks') {
      cx.strokeStyle = 'rgba(15, 23, 42, 0.28)';
      cx.lineWidth = 2;
      for (let y = 0; y < 256; y += 32) {
        cx.beginPath();
        cx.moveTo(0, y);
        cx.lineTo(256, y);
        cx.stroke();
        const off = ((y / 32) % 2) * 32;
        for (let x = off; x < 256; x += 64) {
          cx.beginPath();
          cx.moveTo(x, y);
          cx.lineTo(x, y + 32);
          cx.stroke();
        }
      }
    } else if (mode === 'steel') {
      for (let x = 0; x < 256; x += 16) {
        cx.fillStyle = x % 32 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.16)';
        cx.fillRect(x, 0, 8, 256);
      }
      // Yellow-black hazard chevron along bottom dado
      for (let x = -32; x < 288; x += 32) {
        cx.fillStyle = '#eab308';
        cx.beginPath();
        cx.moveTo(x, 224);
        cx.lineTo(x + 16, 224);
        cx.lineTo(x + 32, 256);
        cx.lineTo(x + 16, 256);
        cx.closePath();
        cx.fill();
      }
    } else if (mode === 'tiles') {
      cx.strokeStyle = 'rgba(255,255,255,0.35)';
      cx.lineWidth = 2;
      for (let y = 0; y < 256; y += 32) {
        cx.beginPath();
        cx.moveTo(0, y);
        cx.lineTo(256, y);
        cx.stroke();
      }
      for (let x = 0; x < 256; x += 32) {
        cx.beginPath();
        cx.moveTo(x, 0);
        cx.lineTo(x, 256);
        cx.stroke();
      }
    } else {
      // Subtle plaster mottling + vertical bamboo/timber battens for warm Cha Dokan or stucco
      for (let i = 0; i < 450; i++) {
        const px = Math.floor(nextRand() * 256);
        const py = Math.floor(nextRand() * 256);
        cx.fillStyle = nextRand() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.07)';
        cx.fillRect(px, py, 3, 3);
      }
      if (mode === 'plaster') {
        cx.fillStyle = 'rgba(69, 26, 3, 0.32)';
        for (let x = 0; x < 256; x += 64) {
          cx.fillRect(x, 0, 8, 256);
        }
      }
    }

    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 1);
    t.anisotropy = maxAniso;
    return t;
  };

  const chaWallMap = makeBuildingWallTex('#b45309', '#fde68a', '#78350f', '#d97706', 'plaster');
  const garageWallMap = makeBuildingWallTex('#047857', '#a7f3d0', '#1e293b', '#eab308', 'blocks');
  const kakaWallMap = makeBuildingWallTex('#b45309', '#fef3c7', '#78350f', '#f59e0b', 'plaster');
  const masterWallMap = makeBuildingWallTex('#78350f', '#fefce8', '#451a03', '#d97706', 'stucco');
  const chachaWallMap = makeBuildingWallTex('#9f1239', '#ffe4e6', '#881337', '#fb7185', 'stucco');
  const khalaWallMap = makeBuildingWallTex('#0f766e', '#ccfbf1', '#115e59', '#2dd4bf', 'plaster');
  const descoWallMap = makeBuildingWallTex('#7f1d1d', '#64748b', '#1e293b', '#dc2626', 'steel');
  const dishWallMap = makeBuildingWallTex('#1d4ed8', '#cbd5e1', '#1e3a8a', '#38bdf8', 'blocks');
  const saloonWallMap = makeBuildingWallTex('#9d174d', '#fce7f3', '#831843', '#f472b6', 'tiles');
  const pharmacyWallMap = makeBuildingWallTex('#0369a1', '#f0f9ff', '#0e7490', '#38bdf8', 'tiles');
  const alleyStuccoMap = makeBuildingWallTex('#9a3412', '#f3e5d0', '#7c2d12', '#d97706', 'plaster');
  const nanaWallMap = makeBuildingWallTex('#b45309', '#fffbeb', '#78350f', '#f59e0b', 'plaster');
  const cinemaWallMap = makeBuildingWallTex('#581c87', '#e9d5ff', '#1e1b4b', '#ec4899', 'tiles');
  const bhaiWallMap = makeBuildingWallTex('#1e40af', '#eff6ff', '#1e293b', '#38bdf8', 'stucco');
  const coachingWallMap = makeBuildingWallTex('#047857', '#ecfdf5', '#064e3b', '#10b981', 'blocks');
  const khaluWallMap = makeBuildingWallTex('#0f766e', '#f0fdfa', '#134e4a', '#14b8a6', 'stucco');
  const kacchiWallMap = makeBuildingWallTex('#991b1b', '#fef2f2', '#450a0a', '#fbbf24', 'tiles');
  const cyberWallMap = makeBuildingWallTex('#312e81', '#1e1b4b', '#0f172a', '#22d3ee', 'steel');
  const dorjiWallMap = makeBuildingWallTex('#86198f', '#fdf4ff', '#4a044e', '#f472b6', 'plaster');
  const gymWallMap = makeBuildingWallTex('#991b1b', '#1e293b', '#090f1d', '#ef4444', 'steel');
  const colonyWallMap = makeBuildingWallTex('#475569', '#e2e8f0', '#334155', '#eab308', 'blocks');
  const fufuWallMap = makeBuildingWallTex('#9d174d', '#fff1f2', '#831843', '#fb7185', 'stucco');

  // 4a-3. Reusable Architectural Normal & Concrete Roughness Maps for Stucco, Blocks, Ceramic Tiles & Rickshaw Fabric
  const stuccoHeightCv = document.createElement('canvas');
  stuccoHeightCv.width = subPx;
  stuccoHeightCv.height = subPx;
  const stHCtx = stuccoHeightCv.getContext('2d')!;
  if (subScale !== 1) stHCtx.scale(subScale, subScale);
  stHCtx.fillStyle = '#808080';
  stHCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4200; i++) {
    const sx = Math.floor(nextRand() * 256);
    const sy = Math.floor(nextRand() * 256);
    const v = 96 + Math.floor(nextRand() * 64);
    stHCtx.fillStyle = `rgb(${v},${v},${v})`;
    stHCtx.fillRect(sx, sy, 2, 2);
  }
  const stuccoNormal = heightCanvasToNormalMap(stuccoHeightCv, 1.35, 3, 1, maxAniso);

  const blockHeightCv = document.createElement('canvas');
  blockHeightCv.width = subPx;
  blockHeightCv.height = subPx;
  const blHCtx = blockHeightCv.getContext('2d')!;
  if (subScale !== 1) blHCtx.scale(subScale, subScale);
  blHCtx.fillStyle = '#d4d4d4';
  blHCtx.fillRect(0, 0, 256, 256);
  blHCtx.strokeStyle = '#3a3a3a';
  blHCtx.lineWidth = 3;
  for (let y = 0; y < 256; y += 32) {
    blHCtx.beginPath();
    blHCtx.moveTo(0, y);
    blHCtx.lineTo(256, y);
    blHCtx.stroke();
    const off = ((y / 32) % 2) * 32;
    for (let x = off; x < 256; x += 64) {
      blHCtx.beginPath();
      blHCtx.moveTo(x, y);
      blHCtx.lineTo(x, y + 32);
      blHCtx.stroke();
    }
  }
  const blockNormal = heightCanvasToNormalMap(blockHeightCv, 2.2, 3, 1, maxAniso);

  const tileHeightCv = document.createElement('canvas');
  tileHeightCv.width = subPx;
  tileHeightCv.height = subPx;
  const tlHCtx = tileHeightCv.getContext('2d')!;
  if (subScale !== 1) tlHCtx.scale(subScale, subScale);
  tlHCtx.fillStyle = '#dcdcdc';
  tlHCtx.fillRect(0, 0, 256, 256);
  tlHCtx.strokeStyle = '#383838';
  tlHCtx.lineWidth = 3;
  for (let y = 0; y <= 256; y += 64) {
    tlHCtx.beginPath();
    tlHCtx.moveTo(0, y);
    tlHCtx.lineTo(256, y);
    tlHCtx.stroke();
  }
  for (let x = 0; x <= 256; x += 64) {
    tlHCtx.beginPath();
    tlHCtx.moveTo(x, 0);
    tlHCtx.lineTo(x, 256);
    tlHCtx.stroke();
  }
  const tileNormal = heightCanvasToNormalMap(tileHeightCv, 2.0, 5, 5, maxAniso);

  const concRoughCv = document.createElement('canvas');
  concRoughCv.width = subPx;
  concRoughCv.height = subPx;
  const crRCtx = concRoughCv.getContext('2d')!;
  if (subScale !== 1) crRCtx.scale(subScale, subScale);
  crRCtx.fillStyle = '#d4d4d4';
  crRCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const cx = Math.floor(nextRand() * 256);
    const cy = Math.floor(nextRand() * 256);
    const rv = 180 + Math.floor(nextRand() * 60);
    crRCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
    crRCtx.fillRect(cx, cy, 3, 3);
  }
  const concreteRoughness = new THREE.CanvasTexture(concRoughCv);
  concreteRoughness.colorSpace = THREE.NoColorSpace;
  concreteRoughness.wrapS = concreteRoughness.wrapT = THREE.RepeatWrapping;
  concreteRoughness.repeat.set(4, 4);
  concreteRoughness.anisotropy = maxAniso;

  // Quilted Rexine Rickshaw Canopy Texture + Pleat Normal Map
  const hoodCv = document.createElement('canvas');
  hoodCv.width = subPx;
  hoodCv.height = subPx;
  const hdCtx = hoodCv.getContext('2d')!;
  if (subScale !== 1) hdCtx.scale(subScale, subScale);
  hdCtx.fillStyle = '#b91c1c';
  hdCtx.fillRect(0, 0, 256, 256);
  const hoodHCv = document.createElement('canvas');
  hoodHCv.width = subPx;
  hoodHCv.height = subPx;
  const hdHCtx = hoodHCv.getContext('2d')!;
  if (subScale !== 1) hdHCtx.scale(subScale, subScale);
  hdHCtx.fillStyle = '#909090';
  hdHCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    const g = hdCtx.createLinearGradient(0, y, 0, y + 32);
    g.addColorStop(0, 'rgba(0,0,0,0.22)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    g.addColorStop(1, 'rgba(0,0,0,0.22)');
    hdCtx.fillStyle = g;
    hdCtx.fillRect(0, y, 256, 32);

    const hg = hdHCtx.createLinearGradient(0, y, 0, y + 32);
    hg.addColorStop(0, '#303030');
    hg.addColorStop(0.5, '#eaeaea');
    hg.addColorStop(1, '#303030');
    hdHCtx.fillStyle = hg;
    hdHCtx.fillRect(0, y, 256, 32);
  }
  // Decorative golden-yellow rickshaw trim band along canopy edge
  hdCtx.fillStyle = '#facc15';
  hdCtx.fillRect(0, 0, 256, 14);
  hdCtx.fillRect(0, 242, 256, 14);
  const rickshawHoodMap = new THREE.CanvasTexture(hoodCv);
  rickshawHoodMap.colorSpace = THREE.SRGBColorSpace;
  rickshawHoodMap.anisotropy = maxAniso;
  const rickshawHoodNormal = heightCanvasToNormalMap(hoodHCv, 2.1, 1, 1, maxAniso);

  // 4b. PUBG-Style Slatted Wooden Supply Crate Albedo + Normal Map
  const crateCanvas = document.createElement('canvas');
  crateCanvas.width = subPx;
  crateCanvas.height = subPx;
  const crCtx = crateCanvas.getContext('2d')!;
  if (subScale !== 1) crCtx.scale(subScale, subScale);
  crCtx.fillStyle = '#5c3a1e';
  crCtx.fillRect(0, 0, 256, 256);

  const crateHeightCanvas = document.createElement('canvas');
  crateHeightCanvas.width = subPx;
  crateHeightCanvas.height = subPx;
  const chCtx = crateHeightCanvas.getContext('2d')!;
  if (subScale !== 1) chCtx.scale(subScale, subScale);
  chCtx.fillStyle = '#404040';
  chCtx.fillRect(0, 0, 256, 256);

  for (let s = 0; s < 5; s++) {
    const shade = 115 + (s % 3) * 14;
    crCtx.fillStyle = `rgb(${shade + 22}, ${Math.round(shade * 0.72)}, ${Math.round(shade * 0.42)})`;
    crCtx.fillRect(18, 18 + s * 44, 220, 40);
    chCtx.fillStyle = '#c8c8c8';
    chCtx.fillRect(18, 18 + s * 44, 220, 40);
  }
  crCtx.strokeStyle = '#784e2b';
  crCtx.lineWidth = 20;
  crCtx.strokeRect(10, 10, 236, 236);
  chCtx.strokeStyle = '#ffffff';
  chCtx.lineWidth = 20;
  chCtx.strokeRect(10, 10, 236, 236);
  crCtx.beginPath();
  crCtx.moveTo(20, 20);
  crCtx.lineTo(236, 236);
  crCtx.stroke();
  chCtx.beginPath();
  chCtx.moveTo(20, 20);
  chCtx.lineTo(236, 236);
  chCtx.stroke();

  const crateWoodMap = new THREE.CanvasTexture(crateCanvas);
  crateWoodMap.colorSpace = THREE.SRGBColorSpace;
  crateWoodMap.anisotropy = maxAniso;
  const crateWoodNormal = heightCanvasToNormalMap(crateHeightCanvas, 2.5, 1, 1, maxAniso);

  // 4c. Woven Jute Burlap Rice Sack Texture (Chaler Bosta)
  const sackCanvas = document.createElement('canvas');
  sackCanvas.width = subPx;
  sackCanvas.height = subPx;
  const skCtx = sackCanvas.getContext('2d')!;
  if (subScale !== 1) skCtx.scale(subScale, subScale);
  skCtx.fillStyle = '#a1805a';
  skCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 6) {
    skCtx.fillStyle = y % 12 === 0 ? 'rgba(69, 44, 18, 0.2)' : 'rgba(255, 240, 200, 0.14)';
    skCtx.fillRect(0, y, 256, 3);
  }
  for (let x = 0; x < 256; x += 6) {
    skCtx.fillStyle = 'rgba(69, 44, 18, 0.14)';
    skCtx.fillRect(x, 0, 2, 256);
  }
  skCtx.fillStyle = '#15803d';
  skCtx.fillRect(0, 114, 256, 28);
  skCtx.fillStyle = '#dc2626';
  skCtx.font = 'bold 28px "Noto Sans Bengali", sans-serif';
  skCtx.textAlign = 'center';
  skCtx.textBaseline = 'middle';
  skCtx.fillText('মিনিকেট ৫০ কেজি', 128, 76);
  const burlapSackMap = new THREE.CanvasTexture(sackCanvas);
  burlapSackMap.colorSpace = THREE.SRGBColorSpace;
  burlapSackMap.anisotropy = maxAniso;

  // 5. Pukur Water Texture
  const waterCanvas = document.createElement('canvas');
  waterCanvas.width = subPx;
  waterCanvas.height = subPx;
  const waCtx = waterCanvas.getContext('2d')!;
  if (subScale !== 1) waCtx.scale(subScale, subScale);
  const wGrad = waCtx.createLinearGradient(0, 0, 256, 256);
  wGrad.addColorStop(0, '#0a3d5c');
  wGrad.addColorStop(0.5, '#0e7490');
  wGrad.addColorStop(1, '#115e59');
  waCtx.fillStyle = wGrad;
  waCtx.fillRect(0, 0, 256, 256);
  waCtx.strokeStyle = 'rgba(186, 230, 253, 0.34)';
  waCtx.lineWidth = 2;
  for (let y = 12; y < 256; y += 22) {
    waCtx.beginPath();
    for (let x = 0; x <= 256; x += 12) {
      const py = y + Math.sin((x / 256) * Math.PI * 4) * 4.5 + Math.cos((x / 256) * Math.PI * 8 + y) * 1.5;
      if (x === 0) waCtx.moveTo(x, py);
      else waCtx.lineTo(x, py);
    }
    waCtx.stroke();
  }
  const waterMap = new THREE.CanvasTexture(waterCanvas);
  waterMap.colorSpace = THREE.SRGBColorSpace;
  waterMap.wrapS = waterMap.wrapT = THREE.RepeatWrapping;
  waterMap.repeat.set(2, 3);
  waterMap.anisotropy = maxAniso;

  // 6. Contact Shadow Disc Texture
  const shCanvas = document.createElement('canvas');
  shCanvas.width = 128;
  shCanvas.height = 128;
  const sCtx = shCanvas.getContext('2d')!;
  const grad = sCtx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.36)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(shCanvas);

  // 7. Pure Bangla Moholla Shop Signboards, Chalkboard Menus & Posters
  const addaSignMap = makeSignTexture('আড্ডা চক', 'মহল্লার কেন্দ্রস্থল · প্রধান চত্বর', '#1e293b', '#fbbf24', maxAniso, compactMode);
  const pukurSignMap = makeSignTexture('পুকুর ঘাট', 'পশ্চিম পাড়ার শানবাঁধানো ঘাট', '#164e63', '#22d3ee', maxAniso, compactMode);
  const bazarSignMap = makeSignTexture('মহল্লা বাজার', 'টাটকা শাকসবজি ও মুদি দোকান', '#7c2d12', '#fbbf24', maxAniso, compactMode);
  const eidgahSignMap = makeSignTexture('ঈদগাহ মাঠ', 'উত্তর পাড়ার খোলা ময়দান', '#064e3b', '#34d399', maxAniso, compactMode);
  const wasaSignMap = makeSignTexture('পানির ট্যাংক', 'ওয়াসা পানি সরবরাহ কেন্দ্র', '#1e3a8a', '#38bdf8', maxAniso, compactMode);
  const chaSignMap = makeSignTexture('মামা টং ও চা', 'গরম দুধ চা ও সিঙ্গারা', '#451a03', '#fbbf24', maxAniso, compactMode);
  const rickshawSignMap = makeSignTexture('সোনার বাংলা গ্যারেজ', 'রিকশা ও সিএনজি মেরামত', '#064e3b', '#34d399', maxAniso, compactMode);
  const descoSignMap = makeSignTexture('ডেসকো পাওয়ার', 'বিদ্যুৎ সাব-স্টেশন · সতর্ক থাকুন', '#450a0a', '#f87171', maxAniso, compactMode);
  const dishSignMap = makeSignTexture('আকাশ ডিশ হাব', 'কেবল টিভি ও ওয়াইফাই কন্ট্রোল', '#172554', '#60a5fa', maxAniso, compactMode);
  const fuchkaSignMap = makeSignTexture('মামা ঝাল ফুচকা', 'স্পেশাল তেঁতুল ও চটপটি', '#7c2d12', '#fde047', maxAniso, compactMode);
  const saloonSignMap = makeSignTexture('হিরো সেলুন', 'স্টাইলিশ চুল কাটা ও শেভ', '#500724', '#f472b6', maxAniso, compactMode);
  const cricketSignMap = makeSignTexture('পাড়া ক্রিকেট মাঠ', 'টেপ টেনিস মহল্লা অ্যারেনা', '#052e16', '#4ade80', maxAniso, compactMode);
  const pharmacySignMap = makeSignTexture('দাদু ফার্মেসি', '২৪ ঘণ্টা জরুরি ওষুধ ও সেবা', '#0c4a6e', '#38bdf8', maxAniso, compactMode);
  const pandalSignMap = makeSignTexture('বিয়ে বাড়ি প্যান্ডেল', 'আলোকসজ্জা ও ডিজে সাউন্ড', '#881337', '#fbbf24', maxAniso, compactMode);
  const kakaSignMap = makeSignTexture('কাকার বাড়ি', 'উত্তর-পশ্চিম আবাসিক ভবন', '#78350f', '#fbbf24', maxAniso, compactMode);
  const masterSignMap = makeSignTexture('মাস্টার বাড়ি', 'হোম টিউশন ও পাঠশালা', '#451a03', '#fde047', maxAniso, compactMode);
  const chachaSignMap = makeSignTexture('চাচার বাড়ি', 'লাল দালান · পুরনো মহল্লা', '#881337', '#fda4af', maxAniso, compactMode);
  const khalaSignMap = makeSignTexture('খালার বাড়ি', 'ছাদবাগান ও বারান্দা মহল', '#115e59', '#5eead4', maxAniso, compactMode);
  const railStationSignMap = makeSignTexture('মহল্লা রেল স্টেশন', 'বাংলা রেল · ১নং প্ল্যাটফর্ম', '#0c4a6e', '#fde047', maxAniso, compactMode);
  const nanaSignMap = makeSignTexture('নানার বাড়ি', 'উঠানবাড়ি ও তেহারি ঘর', '#78350f', '#fde047', maxAniso, compactMode);
  const cinemaSignMap = makeSignTexture('বলাকা সিনেমা হল', 'মেগা শো ও পপকর্ন কর্নার', '#4c1d95', '#f472b6', maxAniso, compactMode);
  const bhaiSignMap = makeSignTexture('বড় ভাই ডুপ্লেক্স', 'ভিআইপি ডুপ্লেক্স ভিলা', '#1e3a8a', '#7dd3fc', maxAniso, compactMode);
  const coachingSignMap = makeSignTexture('জিপিএ-৫ কোচিং', 'সাফল্যের শতভাগ নিশ্চয়তা', '#064e3b', '#34d399', maxAniso, compactMode);
  const khaluSignMap = makeSignTexture('খালুর বাড়ি', 'বাগানবাড়ি · পূর্ব গলি', '#115e59', '#5eead4', maxAniso, compactMode);
  const jheelSignMap = makeSignTexture('ঝিল পাড় লেক', 'নৌকা ঘাট ও শাপলা পুকুর', '#0e7490', '#7dd3fc', maxAniso, compactMode);
  const parkSignMap = makeSignTexture('শিশু পার্ক', 'নাগরদোলা ও আনন্দ মেলা', '#831843', '#f472b6', maxAniso, compactMode);
  const kacchiSignMap = makeSignTexture('নবাব কাচ্চি ঘর', 'শাহী বাসমতি কাচ্চি ও বোরহানি', '#7f1d1d', '#fbbf24', maxAniso, compactMode);
  const cyberSignMap = makeSignTexture('সাইবার গেমিং আড্ডা', 'হাই-স্পিড গেমিং জোন', '#1e1b4b', '#22d3ee', maxAniso, compactMode);
  const dorjiSignMap = makeSignTexture('শিল্পী দর্জি বাড়ি', 'ঈদ পাঞ্জাবি ও ফ্যাশন টেইলার', '#701a75', '#f0abfc', maxAniso, compactMode);
  const gymSignMap = makeSignTexture('টাইগার পাড়া জিম', 'বডিবিল্ডিং ও ফিটনেস ক্লাব', '#7f1d1d', '#f87171', maxAniso, compactMode);
  const machSignMap = makeSignTexture('ওপার মাছ বাজার', 'পদ্মার তাজা ইলিশ ও রুই', '#075985', '#7dd3fc', maxAniso, compactMode);
  const colonySignMap = makeSignTexture('রেল কলোনি কোয়ার্টার', 'রেলওয়ে কর্মচারী আবাসন', '#334155', '#fde047', maxAniso, compactMode);
  const signalSignMap = makeSignTexture('সিগন্যাল টাওয়ার', 'দক্ষিণ রেল কন্ট্রোল ইয়ার্ড', '#713f12', '#facc15', maxAniso, compactMode);
  const fufuSignMap = makeSignTexture('ফুফুর বাড়ি', 'ওপার পাড়ার আতিথেয়তা', '#881337', '#fda4af', maxAniso, compactMode);

  // Cha Menu Chalkboard
  const cmCanvas = document.createElement('canvas');
  cmCanvas.width = Math.round(256 * subScale);
  cmCanvas.height = Math.round(192 * subScale);
  const cmCtx = cmCanvas.getContext('2d')!;
  if (subScale !== 1) cmCtx.scale(subScale, subScale);
  cmCtx.fillStyle = '#0f291e';
  cmCtx.fillRect(0, 0, 256, 192);
  cmCtx.strokeStyle = '#92400e';
  cmCtx.lineWidth = 10;
  cmCtx.strokeRect(5, 5, 246, 182);
  cmCtx.fillStyle = '#fde047';
  cmCtx.font = 'bold 24px "Noto Sans Bengali", sans-serif';
  cmCtx.textAlign = 'center';
  cmCtx.fillText('মামা টং মেনু', 128, 36);
  cmCtx.fillStyle = '#f8fafc';
  cmCtx.font = 'bold 18px "Noto Sans Bengali", sans-serif';
  cmCtx.fillText('দুধ চা ......... ১০৳', 128, 76);
  cmCtx.fillText('রং চা ......... ৫৳', 128, 108);
  cmCtx.fillText('সিঙ্গারা/বন ... ১০৳', 128, 140);
  cmCtx.fillText('পান-সুপারি .... ১০৳', 128, 170);
  const chaMenuMap = new THREE.CanvasTexture(cmCanvas);
  chaMenuMap.colorSpace = THREE.SRGBColorSpace;
  chaMenuMap.anisotropy = maxAniso;

  // Cricket Scoreboard
  const scCanvas = document.createElement('canvas');
  scCanvas.width = Math.round(256 * subScale);
  scCanvas.height = Math.round(160 * subScale);
  const scCtx = scCanvas.getContext('2d')!;
  if (subScale !== 1) scCtx.scale(subScale, subScale);
  scCtx.fillStyle = '#052e16';
  scCtx.fillRect(0, 0, 256, 160);
  scCtx.strokeStyle = '#f8fafc';
  scCtx.lineWidth = 6;
  scCtx.strokeRect(6, 6, 244, 148);
  scCtx.fillStyle = '#fbbf24';
  scCtx.font = 'bold 22px "Noto Sans Bengali", sans-serif';
  scCtx.textAlign = 'center';
  scCtx.fillText('মহল্লা প্রিমিয়ার লিগ', 128, 34);
  scCtx.fillStyle = '#ffffff';
  scCtx.font = 'bold 34px "Noto Sans Bengali", sans-serif';
  scCtx.fillText('১৪২ / ৪', 128, 86);
  scCtx.fillStyle = '#4ade80';
  scCtx.font = 'bold 18px "Noto Sans Bengali", sans-serif';
  scCtx.fillText('ওভার: ১১.৪ · লক্ষ্য: ১৫০', 128, 130);
  const scoreboardMap = new THREE.CanvasTexture(scCanvas);
  scoreboardMap.colorSpace = THREE.SRGBColorSpace;
  scoreboardMap.anisotropy = maxAniso;

  // Saloon Haircut Style Poster
  const spCanvas = document.createElement('canvas');
  spCanvas.width = Math.round(256 * subScale);
  spCanvas.height = Math.round(320 * subScale);
  const spCtx = spCanvas.getContext('2d')!;
  if (subScale !== 1) spCtx.scale(subScale, subScale);
  spCtx.fillStyle = '#1e1b4b';
  spCtx.fillRect(0, 0, 256, 320);
  spCtx.strokeStyle = '#f472b6';
  spCtx.lineWidth = 10;
  spCtx.strokeRect(10, 10, 236, 300);
  spCtx.fillStyle = '#fbcfe8';
  spCtx.font = 'bold 26px "Noto Sans Bengali", sans-serif';
  spCtx.textAlign = 'center';
  spCtx.fillText('হিরো হেয়ার কাটিং', 128, 52);
  spCtx.fillStyle = '#38bdf8';
  spCtx.beginPath();
  spCtx.arc(128, 150, 56, 0, Math.PI * 2);
  spCtx.fill();
  spCtx.fillStyle = '#0f172a';
  spCtx.beginPath();
  spCtx.arc(128, 126, 46, Math.PI, 0);
  spCtx.fill();
  spCtx.fillStyle = '#fde047';
  spCtx.font = 'bold 20px "Noto Sans Bengali", sans-serif';
  spCtx.fillText('ফেড · স্পাইক · স্পা', 128, 248);
  spCtx.fillText('মাত্র ৬০ টাকা!', 128, 282);
  const saloonPosterMap = new THREE.CanvasTexture(spCanvas);
  saloonPosterMap.colorSpace = THREE.SRGBColorSpace;
  saloonPosterMap.anisotropy = maxAniso;

  const posterMaps: [THREE.CanvasTexture, THREE.CanvasTexture] = [
    makePosterTexture('এখানে পোস্টার লাগাবেন না!', 'পাড়াবাসী সব দেখছে', '#fef3c7', '#b91c1c', maxAniso, compactMode),
    makePosterTexture('১০০% জিপিএ-৫ কোচিং', 'টং আড্ডার পাশে ভর্তি চলছে', '#e0f2fe', '#1d4ed8', maxAniso, compactMode),
  ];

  // 7c. High-Resolution Bangla Roadside Billboard Hoardings & Boulevard Gantry Banners
  const hoardingGgMap = makeHoardingTexture(
    'সাইবার গেমিং আড্ডা',
    'মহল্লা স্কোয়াড টুর্নামেন্ট · পুরস্কার ৫০০০৳',
    'ই-স্পোর্টস অ্যারেনা',
    '#0f172a',
    '#312e81',
    '#22d3ee',
    maxAniso,
    compactMode,
  );
  const hoardingKacchiMap = makeHoardingTexture(
    'নবাব কাচ্চি ও তেহারি',
    'গরম বাসমতি প্লেটার · খোলা ২৪ ঘণ্টা',
    'শাহী ভোজ',
    '#450a0a',
    '#991b1b',
    '#fbbf24',
    maxAniso,
    compactMode,
  );
  const hoardingRailMap = makeHoardingTexture(
    'বাংলা এক্সপ্রেস রেলওয়ে',
    'লেভেল ক্রসিংয়ে দুই দিক দেখে পার হোন',
    'রেল সতর্কতা',
    '#064e3b',
    '#0f172a',
    '#facc15',
    maxAniso,
    compactMode,
  );
  const hoardingAdMap = makeHoardingTexture(
    'স্পেশাল এয়ারড্রপ জোন',
    'মহল্লার বাটপার খুঁজুন · সতর্ক থাকুন',
    'জরুরি সতর্কতা',
    '#1e293b',
    '#7c2d12',
    '#fb923c',
    maxAniso,
    compactMode,
  );
  const gantryNorthMap = makeGantryBannerTexture(
    'স্বাগতম · উত্তর মহল্লা অ্যাভিনিউ',
    'বলাকা সিনেমা • বড় ভাই ডুপ্লেক্স • ঈদগাহ মাঠ • কোচিং সেন্টার',
    '#0f172a',
    '#fbbf24',
    maxAniso,
    compactMode,
  );
  const gantrySouthMap = makeGantryBannerTexture(
    'ওপার বাংলা · দক্ষিণ রেল ও বাজার',
    'রেল জংশন • ওপার মাছ বাজার • রেল কলোনি • সিগন্যাল টাওয়ার',
    '#0c4a6e',
    '#fde047',
    maxAniso,
    compactMode,
  );

  // 7b. Hand-Painted Dhaka Rickshaw Folk-Art Panel
  const rCanvas = document.createElement('canvas');
  rCanvas.width = Math.round(256 * subScale);
  rCanvas.height = Math.round(128 * subScale);
  const rCtx = rCanvas.getContext('2d')!;
  if (subScale !== 1) rCtx.scale(subScale, subScale);
  rCtx.fillStyle = '#0f766e';
  rCtx.fillRect(0, 0, 256, 128);
  rCtx.strokeStyle = '#facc15';
  rCtx.lineWidth = 8;
  rCtx.strokeRect(6, 6, 244, 116);
  rCtx.fillStyle = '#e11d48';
  rCtx.beginPath();
  rCtx.arc(128, 64, 34, 0, Math.PI * 2);
  rCtx.fill();
  rCtx.fillStyle = '#fef08a';
  for (let p = 0; p < 8; p++) {
    const a = (p / 8) * Math.PI * 2;
    rCtx.beginPath();
    rCtx.arc(128 + Math.cos(a) * 26, 64 + Math.sin(a) * 26, 10, 0, Math.PI * 2);
    rCtx.fill();
  }
  rCtx.fillStyle = '#38bdf8';
  rCtx.beginPath();
  rCtx.arc(52, 64, 16, 0, Math.PI * 2);
  rCtx.arc(204, 64, 16, 0, Math.PI * 2);
  rCtx.fill();
  const rickshawArtMap = new THREE.CanvasTexture(rCanvas);
  rickshawArtMap.colorSpace = THREE.SRGBColorSpace;
  rickshawArtMap.anisotropy = maxAniso;

  // 8. Bengali Alpona Mandala Ring
  const alpCanvas = document.createElement('canvas');
  alpCanvas.width = tilePx;
  alpCanvas.height = tilePx;
  const alCtx = alpCanvas.getContext('2d')!;
  if (tileScale !== 1) alCtx.scale(tileScale, tileScale);
  alCtx.clearRect(0, 0, 512, 512);
  alCtx.save();
  alCtx.translate(256, 256);
  alCtx.strokeStyle = 'rgba(254, 243, 199, 0.85)';
  alCtx.lineWidth = 6;
  alCtx.beginPath();
  alCtx.arc(0, 0, 214, 0, Math.PI * 2);
  alCtx.stroke();
  alCtx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
  alCtx.lineWidth = 4;
  alCtx.beginPath();
  alCtx.arc(0, 0, 180, 0, Math.PI * 2);
  alCtx.stroke();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    alCtx.save();
    alCtx.rotate(a);
    alCtx.fillStyle = i % 2 === 0 ? 'rgba(254, 240, 138, 0.8)' : 'rgba(244, 114, 182, 0.74)';
    alCtx.beginPath();
    alCtx.moveTo(180, 0);
    alCtx.quadraticCurveTo(208, 18, 236, 0);
    alCtx.quadraticCurveTo(208, -18, 180, 0);
    alCtx.fill();
    alCtx.restore();
  }
  alCtx.restore();
  const alponaMap = new THREE.CanvasTexture(alpCanvas);
  alponaMap.colorSpace = THREE.SRGBColorSpace;
  alponaMap.anisotropy = maxAniso;

  // 9. Striped Festive Bazar Awning
  const awnCanvas = document.createElement('canvas');
  awnCanvas.width = subPx;
  awnCanvas.height = subPx;
  const awCtx = awnCanvas.getContext('2d')!;
  if (subScale !== 1) awCtx.scale(subScale, subScale);
  const stripeColors = ['#d97706', '#fef3c7', '#dc2626', '#fef3c7'];
  const sw = 256 / 8;
  for (let i = 0; i < 8; i++) {
    awCtx.fillStyle = stripeColors[i % stripeColors.length];
    awCtx.fillRect(0, i * sw, 256, sw);
  }
  const bazarAwningMap = new THREE.CanvasTexture(awnCanvas);
  bazarAwningMap.colorSpace = THREE.SRGBColorSpace;
  bazarAwningMap.anisotropy = maxAniso;

  // 10. Striped Para Cricket Stadium Turf Map
  const turfCanvas = document.createElement('canvas');
  turfCanvas.width = subPx;
  turfCanvas.height = subPx;
  const tfCtx = turfCanvas.getContext('2d')!;
  if (subScale !== 1) tfCtx.scale(subScale, subScale);
  for (let row = 0; row < 8; row++) {
    tfCtx.fillStyle = row % 2 === 0 ? '#1f9d4c' : '#187c3c';
    tfCtx.fillRect(0, row * 32, 256, 32);
  }
  for (let b = 0; b < 1600; b++) {
    const tx = Math.floor(nextRand() * 256);
    const ty = Math.floor(nextRand() * 256);
    tfCtx.fillStyle = nextRand() > 0.5 ? 'rgba(187, 247, 208, 0.18)' : 'rgba(20, 83, 45, 0.24)';
    tfCtx.fillRect(tx, ty, 2, 2);
  }
  const cricketTurfMap = new THREE.CanvasTexture(turfCanvas);
  cricketTurfMap.colorSpace = THREE.SRGBColorSpace;
  cricketTurfMap.wrapS = cricketTurfMap.wrapT = THREE.RepeatWrapping;
  cricketTurfMap.repeat.set(3, 4);
  cricketTurfMap.anisotropy = maxAniso;

  return {
    cobbleMap,
    cobbleNormal,
    asphaltMap,
    asphaltNormal,
    asphaltRoughness,
    stuccoNormal,
    blockNormal,
    tileNormal,
    concreteRoughness,
    rickshawHoodMap,
    rickshawHoodNormal,
    terracottaTileMap,
    saloonTileMap,
    pharmacyTileMap,
    garageFloorMap,
    sidewalkMap,
    grassMap,
    tinBump,
    tinNormal,
    wallBrickMap,
    wallBrickNormal,
    chaWallMap,
    garageWallMap,
    descoWallMap,
    dishWallMap,
    saloonWallMap,
    pharmacyWallMap,
    alleyStuccoMap,
    crateWoodMap,
    crateWoodNormal,
    burlapSackMap,
    waterMap,
    contactShadowMap,
    addaSignMap,
    pukurSignMap,
    bazarSignMap,
    eidgahSignMap,
    wasaSignMap,
    chaSignMap,
    chaMenuMap,
    rickshawSignMap,
    descoSignMap,
    dishSignMap,
    rickshawArtMap,
    posterMaps,
    saloonPosterMap,
    alponaMap,
    bazarAwningMap,
    fuchkaSignMap,
    saloonSignMap,
    cricketSignMap,
    scoreboardMap,
    pharmacySignMap,
    pandalSignMap,
    kakaWallMap,
    masterWallMap,
    chachaWallMap,
    khalaWallMap,
    kakaSignMap,
    masterSignMap,
    chachaSignMap,
    khalaSignMap,
    railStationSignMap,
    cricketTurfMap,
    nanaWallMap,
    cinemaWallMap,
    bhaiWallMap,
    coachingWallMap,
    khaluWallMap,
    kacchiWallMap,
    cyberWallMap,
    dorjiWallMap,
    gymWallMap,
    colonyWallMap,
    fufuWallMap,
    nanaSignMap,
    cinemaSignMap,
    bhaiSignMap,
    coachingSignMap,
    khaluSignMap,
    jheelSignMap,
    parkSignMap,
    kacchiSignMap,
    cyberSignMap,
    dorjiSignMap,
    gymSignMap,
    machSignMap,
    colonySignMap,
    signalSignMap,
    fufuSignMap,
    hoardingGgMap,
    hoardingKacchiMap,
    hoardingRailMap,
    hoardingAdMap,
    gantryNorthMap,
    gantrySouthMap,
    dispose: () => {
      cobbleMap.dispose();
      cobbleNormal.dispose();
      asphaltMap.dispose();
      asphaltNormal.dispose();
      asphaltRoughness.dispose();
      stuccoNormal.dispose();
      blockNormal.dispose();
      tileNormal.dispose();
      concreteRoughness.dispose();
      rickshawHoodMap.dispose();
      rickshawHoodNormal.dispose();
      terracottaTileMap.dispose();
      saloonTileMap.dispose();
      pharmacyTileMap.dispose();
      garageFloorMap.dispose();
      sidewalkMap.dispose();
      grassMap.dispose();
      tinBump.dispose();
      tinNormal.dispose();
      wallBrickMap.dispose();
      wallBrickNormal.dispose();
      chaWallMap.dispose();
      garageWallMap.dispose();
      descoWallMap.dispose();
      dishWallMap.dispose();
      saloonWallMap.dispose();
      pharmacyWallMap.dispose();
      alleyStuccoMap.dispose();
      crateWoodMap.dispose();
      crateWoodNormal.dispose();
      burlapSackMap.dispose();
      waterMap.dispose();
      contactShadowMap.dispose();
      addaSignMap.dispose();
      pukurSignMap.dispose();
      bazarSignMap.dispose();
      eidgahSignMap.dispose();
      wasaSignMap.dispose();
      chaSignMap.dispose();
      chaMenuMap.dispose();
      rickshawSignMap.dispose();
      descoSignMap.dispose();
      dishSignMap.dispose();
      rickshawArtMap.dispose();
      posterMaps[0].dispose();
      posterMaps[1].dispose();
      saloonPosterMap.dispose();
      alponaMap.dispose();
      bazarAwningMap.dispose();
      fuchkaSignMap.dispose();
      saloonSignMap.dispose();
      cricketSignMap.dispose();
      scoreboardMap.dispose();
      pharmacySignMap.dispose();
      pandalSignMap.dispose();
      kakaWallMap.dispose();
      masterWallMap.dispose();
      chachaWallMap.dispose();
      khalaWallMap.dispose();
      kakaSignMap.dispose();
      masterSignMap.dispose();
      chachaSignMap.dispose();
      khalaSignMap.dispose();
      railStationSignMap.dispose();
      cricketTurfMap.dispose();
      nanaWallMap.dispose();
      cinemaWallMap.dispose();
      bhaiWallMap.dispose();
      coachingWallMap.dispose();
      khaluWallMap.dispose();
      kacchiWallMap.dispose();
      cyberWallMap.dispose();
      dorjiWallMap.dispose();
      gymWallMap.dispose();
      colonyWallMap.dispose();
      fufuWallMap.dispose();
      nanaSignMap.dispose();
      cinemaSignMap.dispose();
      bhaiSignMap.dispose();
      coachingSignMap.dispose();
      khaluSignMap.dispose();
      jheelSignMap.dispose();
      parkSignMap.dispose();
      kacchiSignMap.dispose();
      cyberSignMap.dispose();
      dorjiSignMap.dispose();
      gymSignMap.dispose();
      machSignMap.dispose();
      colonySignMap.dispose();
      signalSignMap.dispose();
      fufuSignMap.dispose();
      hoardingGgMap.dispose();
      hoardingKacchiMap.dispose();
      hoardingRailMap.dispose();
      hoardingAdMap.dispose();
      gantryNorthMap.dispose();
      gantrySouthMap.dispose();
    },
  };
}
