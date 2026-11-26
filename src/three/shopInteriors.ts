import * as THREE from 'three';
import type { ProceduralTextureSet } from './proceduralTextures';
import { optimizeStaticGroup } from './geometryBatch';

export interface AnimatedShopRefs {
  barberPole: THREE.Group;
  wooferCones: THREE.Mesh[];
  ceilingFans: THREE.Group[];
  exhaustFan: THREE.Group;
  serverLeds: THREE.MeshBasicMaterial[];
  pukurBoat: THREE.Group;
  pukurFlowers: THREE.Group[];
}

export function createAddaMonument(isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.78, metalness: 0.08 });
  const topMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.36, metalness: 0.18 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.2, metalness: 0.88 });
  const steelMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.18, metalness: 0.9 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.75 });
  const redBtnMat = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#dc2626',
    emissiveIntensity: 0.75,
    roughness: 0.25,
  });

  // Stepped octagonal beveled dais
  const plinth1 = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.28, 0.18, 8), stoneMat);
  plinth1.position.y = 0.09;
  plinth1.receiveShadow = true;
  const plinth2 = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.88, 0.18, 8), topMat);
  plinth2.position.y = 0.26;
  plinth2.receiveShadow = true;
  group.add(plinth1, plinth2);

  // Turned LatheGeometry Stone Pedestal
  const lathePts = [
    new THREE.Vector2(0.01, 0.34),
    new THREE.Vector2(0.68, 0.34),
    new THREE.Vector2(0.56, 0.48),
    new THREE.Vector2(0.4, 0.7),
    new THREE.Vector2(0.52, 0.98),
    new THREE.Vector2(0.75, 1.06),
    new THREE.Vector2(0.01, 1.06),
  ];
  const tableStem = new THREE.Mesh(new THREE.LatheGeometry(lathePts, 28), stoneMat);
  tableStem.castShadow = !isSoftwareGl;
  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(1.66, 1.66, 0.14, 36), topMat);
  tableTop.position.y = 1.12;
  tableTop.castShadow = !isSoftwareGl;
  tableTop.receiveShadow = true;
  const tableRim = new THREE.Mesh(new THREE.TorusGeometry(1.66, 0.055, 14, 40), brassMat);
  tableRim.rotation.x = Math.PI / 2;
  tableRim.position.y = 1.13;
  group.add(tableStem, tableTop, tableRim);

  // Emergency Adda Bell
  const bellBase = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.14, 24), brassMat);
  bellBase.position.y = 1.26;
  const bellDome = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), redBtnMat);
  bellDome.position.y = 1.32;
  const bellRing = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.04, 12, 28), brassMat);
  bellRing.rotation.x = Math.PI / 2;
  bellRing.position.y = 1.23;
  group.add(bellBase, bellDome, bellRing);

  // Turned Clay Bhar Cups & Colorful Plastic Moras
  const bharPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.065, 0),
    new THREE.Vector2(0.095, 0.11),
    new THREE.Vector2(0.085, 0.17),
    new THREE.Vector2(0.072, 0.17),
    new THREE.Vector2(0.058, 0.04),
    new THREE.Vector2(0.01, 0.04),
  ];
  const cupGeo = new THREE.LatheGeometry(bharPts, 18);
  const cupMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.8 });
  const moraColors = ['#e11d48', '#2563eb', '#16a34a', '#eab308'];

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + 0.4;
    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.position.set(Math.cos(angle) * 1.04, 1.19, Math.sin(angle) * 1.04);
    group.add(cup);

    const mora = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.32, 0.4, 24),
      new THREE.MeshStandardMaterial({ color: moraColors[i], roughness: 0.42 }),
    );
    mora.position.set(Math.cos(angle) * 2.35, 0.2, Math.sin(angle) * 2.35);
    mora.castShadow = !isSoftwareGl;
    const moraRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.27, 0.032, 10, 24),
      new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.4 }),
    );
    moraRim.rotation.x = Math.PI / 2;
    moraRim.position.set(mora.position.x, 0.39, mora.position.z);
    group.add(mora, moraRim);
  }

  // Plate of Shingara Snacks
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.22, 0.04, 24),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.22 }),
  );
  plate.position.set(0.62, 1.21, 0.42);
  group.add(plate);
  const shingaraMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.7 });
  for (const [sx, sz] of [
    [0.55, 0.38],
    [0.68, 0.46],
    [0.62, 0.32],
  ]) {
    const sh = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.13, 4), shingaraMat);
    sh.position.set(sx, 1.28, sz);
    sh.rotation.y = sx * 4;
    group.add(sh);
  }

  // Stainless Steel Chai Thermos Flask + Water Jug + Folded Daily Newspaper on Table
  const flask = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.46, 20), steelMat);
  flask.position.set(-0.72, 1.42, -0.45);
  const flaskCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.12, 18), redBtnMat);
  flaskCap.position.set(-0.72, 1.7, -0.45);
  const paper = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.025, 0.34),
    new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.85 }),
  );
  paper.position.set(-0.55, 1.2, 0.65);
  paper.rotation.y = 0.35;
  group.add(flask, flaskCap, paper);

  // Corner Stone & Wood Adda Benches along Plaza Diagonal Edges
  const benchCorners: Array<[number, number, number]> = [
    [-6.9, -6.9, Math.PI / 4],
    [6.9, -6.9, -Math.PI / 4],
    [-6.9, 6.9, -Math.PI / 4],
    [6.9, 6.9, Math.PI / 4],
  ];
  for (const [bx, bz, rot] of benchCorners) {
    const bGrp = new THREE.Group();
    bGrp.position.set(bx, 0, bz);
    bGrp.rotation.y = rot;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 0.62), woodMat);
    seat.position.y = 0.46;
    seat.castShadow = !isSoftwareGl;
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.56), stoneMat);
    leg1.position.set(-0.82, 0.225, 0);
    const leg2 = leg1.clone();
    leg2.position.x = 0.82;
    bGrp.add(seat, leg1, leg2);
    group.add(bGrp);
  }

  return optimizeStaticGroup(group);
}

export function createChaStallProps(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): { group: THREE.Group; ceilingFan: THREE.Group } {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.82 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.84 });
  const tinMat = new THREE.MeshStandardMaterial({
    color: '#64748b',
    roughness: 0.34,
    metalness: 0.78,
    normalMap: textures.tinNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
  });
  const kettleMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.16, metalness: 0.92 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.25, metalness: 0.85 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: '#e0f2fe',
    roughness: 0.1,
    metalness: 0.15,
    transparent: true,
    opacity: 0.44,
  });
  const signMat = new THREE.MeshStandardMaterial({ map: textures.chaSignMap, roughness: 0.42 });

  // Main Timber Counter (-39.5..-31.5, -37.2..-35.2)
  const counter = new THREE.Mesh(new THREE.BoxGeometry(8.0, 1.12, 1.9), woodMat);
  counter.position.set(-35.5, 0.56, -36.2);
  counter.castShadow = !isSoftwareGl;
  counter.receiveShadow = true;
  const counterLedge = new THREE.Mesh(new THREE.BoxGeometry(8.16, 0.08, 2.06), darkWoodMat);
  counterLedge.position.set(-35.5, 1.12, -36.2);
  group.add(counter, counterLedge);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.16, 4.0), tinMat);
  roof.position.set(-35.5, 3.05, -35.6);
  roof.rotation.x = 0.14;
  group.add(roof);

  for (const px of [-39.6, -31.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 3.05, 14), woodMat);
    post.position.set(px, 1.52, -34.2);
    group.add(post);
  }

  // Clay Chula Stove + Glowing Blue Gas Flame + Boiling Aluminum Patila + Tea Kettle
  const stoveBody = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.22, 20), darkWoodMat);
  stoveBody.position.set(-33.4, 1.25, -36.1);
  const flameRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.035, 8, 20),
    new THREE.MeshBasicMaterial({ color: '#38bdf8' }),
  );
  flameRing.rotation.x = Math.PI / 2;
  flameRing.position.set(-33.4, 1.38, -36.1);

  const patilaPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.34, 0),
    new THREE.Vector2(0.4, 0.34),
    new THREE.Vector2(0.44, 0.36),
    new THREE.Vector2(0.34, 0.36),
    new THREE.Vector2(0.01, 0.36),
  ];
  const patila = new THREE.Mesh(new THREE.LatheGeometry(patilaPts, 24), kettleMat);
  patila.position.set(-33.4, 1.38, -36.1);
  const milkTeaSurface = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.03, 20),
    new THREE.MeshStandardMaterial({ color: '#c28550', roughness: 0.2 }),
  );
  milkTeaSurface.position.set(-33.4, 1.72, -36.1);
  group.add(stoveBody, flameRing, patila, milkTeaSurface);

  const kettlePts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.28, 0),
    new THREE.Vector2(0.32, 0.16),
    new THREE.Vector2(0.22, 0.38),
    new THREE.Vector2(0.26, 0.44),
    new THREE.Vector2(0.11, 0.52),
    new THREE.Vector2(0.01, 0.52),
  ];
  const kettle = new THREE.Mesh(new THREE.LatheGeometry(kettlePts, 24), kettleMat);
  kettle.position.set(-34.4, 1.16, -36.1);
  group.add(kettle);

  // Glass Biscuit & Danecake Display Case on Left Half of Counter
  const caseGlass = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.96, 1.15), glassMat);
  caseGlass.position.set(-37.6, 1.64, -36.2);
  const caseTrim = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.08, 1.22), brassMat);
  caseTrim.position.set(-37.6, 2.14, -36.2);
  const shelfMid = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.04, 1.05), woodMat);
  shelfMid.position.set(-37.6, 1.62, -36.2);
  group.add(caseGlass, caseTrim, shelfMid);

  // Biscuits, Danecakes & Boiled Eggs inside Display Case
  const cakeMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.65 });
  const eggMat = new THREE.MeshStandardMaterial({ color: '#fef9c3', roughness: 0.35 });
  for (let c = 0; c < 4; c++) {
    const cake = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.38), cakeMat);
    cake.position.set(-38.45 + c * 0.56, 1.26, -36.2);
    group.add(cake);
  }
  for (let e = 0; e < 6; e++) {
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), eggMat);
    egg.scale.set(0.85, 1.2, 0.85);
    egg.position.set(-38.4 + e * 0.26, 1.74, -36.1);
    group.add(egg);
  }

  // Condensed Milk Tins + Biscuit Jars + Tea Glass Stand
  const tinMilkMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.35, metalness: 0.45 });
  for (let t = 0; t < 3; t++) {
    const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.24, 16), tinMilkMat);
    tin.position.set(-35.1 + t * 0.26, 1.28, -35.6);
    group.add(tin);
  }
  const jar1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.5, 20),
    new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.2, transparent: true, opacity: 0.84 }),
  );
  jar1.position.set(-35.7, 1.4, -36.3);
  const jar2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.44, 20),
    new THREE.MeshStandardMaterial({ color: '#fb7185', roughness: 0.2, transparent: true, opacity: 0.84 }),
  );
  jar2.position.set(-36.2, 1.37, -36.3);
  group.add(jar1, jar2);

  // Stacked Clear Cha Glasses Tray
  for (let g = 0; g < 6; g++) {
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.16, 12), glassMat);
    gl.position.set(-32.4 + (g % 3) * 0.2, 1.24, -35.6 - Math.floor(g / 3) * 0.22);
    group.add(gl);
  }

  // Hanging Golden Banana Bunch (Kola) & Warm Tungsten Stall Bulb
  const bananaMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.42 });
  for (let b = 0; b < 5; b++) {
    const ban = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.2, 8, 12), bananaMat);
    ban.position.set(-31.9 + b * 0.09, 2.55 - (b % 2) * 0.05, -34.2);
    ban.rotation.z = 0.25 - b * 0.1;
    group.add(ban);
  }
  const stallBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 16),
    new THREE.MeshStandardMaterial({
      color: '#fef9c3',
      emissive: '#fde047',
      emissiveIntensity: 0.32,
      roughness: 0.22,
    }),
  );
  stallBulb.position.set(-35.5, 2.75, -34.6);
  group.add(stallBulb);

  // Illuminated Cold-Drinks Beverage Mini-Fridge in NW Corner (-43.2, -38.8)
  const fridgeGrp = new THREE.Group();
  fridgeGrp.position.set(-43.2, 0, -38.8);
  const fridgeBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 2.25, 1.25),
    new THREE.MeshStandardMaterial({ color: '#e11d48', roughness: 0.28, metalness: 0.35 }),
  );
  fridgeBody.position.y = 1.125;
  fridgeBody.castShadow = !isSoftwareGl;
  const fridgeInner = new THREE.Mesh(
    new THREE.BoxGeometry(1.22, 1.78, 0.12),
    new THREE.MeshStandardMaterial({ color: '#e0f2fe', emissive: '#38bdf8', emissiveIntensity: 0.45 }),
  );
  fridgeInner.position.set(0, 1.15, 0.58);
  fridgeGrp.add(fridgeBody, fridgeInner);

  const bottleMats = ['#ef4444', '#22c55e', '#f59e0b', '#3b82f6'].map(
    (col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.15 }),
  );
  const bottleGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.32, 10);
  for (let shelf = 0; shelf < 3; shelf++) {
    for (let b = 0; b < 4; b++) {
      const bot = new THREE.Mesh(bottleGeo, bottleMats[(shelf + b) % bottleMats.length]);
      bot.position.set(-0.38 + b * 0.25, 0.62 + shelf * 0.52, 0.62);
      fridgeGrp.add(bot);
    }
  }
  group.add(fridgeGrp);

  // Back Wall Rack & Bangla Tea Rate Menu Chalkboard on North Wall (z=-39.8)
  const wallShelf = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.12, 0.65), woodMat);
  wallShelf.position.set(-35.5, 1.9, -39.6);
  const menuBoard = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.85, 0.1),
    new THREE.MeshStandardMaterial({ map: textures.chaMenuMap, roughness: 0.55 }),
  );
  menuBoard.position.set(-35.5, 2.35, -39.95);
  group.add(wallShelf, menuBoard);
  for (let j = 0; j < 6; j++) {
    const bigJar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.42, 14),
      new THREE.MeshStandardMaterial({ color: j % 2 === 0 ? '#eab308' : '#22c55e', roughness: 0.25 }),
    );
    bigJar.position.set(-38.2 + j * 1.05, 2.17, -39.6);
    group.add(bigJar);
  }

  // Front Wooden Tea Bench + Side Tea Bench & Low Table (-42.2, -28.0)
  const benchTop = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.68), woodMat);
  benchTop.position.set(-35.5, 0.48, -28.6);
  benchTop.castShadow = !isSoftwareGl;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.46, 0.56), woodMat);
  legL.position.set(-36.9, 0.23, -28.6);
  const legR = legL.clone();
  legR.position.x = -34.1;
  group.add(benchTop, legL, legR);

  const sideBench = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.48, 3.2), woodMat);
  sideBench.position.set(-43.0, 0.24, -27.5);
  sideBench.castShadow = !isSoftwareGl;
  const sideTable = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.68, 2.2), woodMat);
  sideTable.position.set(-41.8, 0.34, -27.5);
  sideTable.castShadow = !isSoftwareGl;
  group.add(sideBench, sideTable);

  // Spinning Ceiling Fan over Cha-er Dokan
  const ceilingFan = createCeilingFan('#0f766e');
  ceilingFan.position.set(-35.5, 3.35, -31.5);
  group.add(ceilingFan);

  const sign = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.3, 0.16), signMat);
  sign.position.set(-35.5, 3.65, -33.7);
  group.add(sign);

  return { group: optimizeStaticGroup(group, [ceilingFan]), ceilingFan };
}

function createCeilingFan(bladeHex: string): THREE.Group {
  const fan = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.25, metalness: 0.85 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: bladeHex, roughness: 0.32, metalness: 0.65 });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 10), metalMat);
  rod.position.y = 0.28;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.16, 18), bladeMat);
  fan.add(rod, hub);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.03, 0.24), bladeMat);
    const a = (i / 3) * Math.PI * 2;
    blade.position.set(Math.cos(a) * 0.78, 0, Math.sin(a) * 0.78);
    blade.rotation.y = -a;
    blade.rotation.x = 0.16;
    fan.add(blade);
  }
  return fan;
}

export function createBazarProps(textures: ProceduralTextureSet, isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const crateMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.85 });
  const rackWood = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.78 });
  const basketMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.88 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.22, metalness: 0.88 });
  const sackMat = new THREE.MeshStandardMaterial({ map: textures.burlapSackMap, roughness: 0.92 });
  const riceMat = new THREE.MeshStandardMaterial({ color: '#fef9c3', roughness: 0.65 });
  const dalMat = new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.65 });

  // Multi-Tier Mudir Dokan Back Grocery Rack behind counter (x=47.2, z=-4.8..4.8)
  const rackFrame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.7, 9.6), rackWood);
  rackFrame.position.set(47.4, 1.35, 0);
  rackFrame.castShadow = !isSoftwareGl;
  group.add(rackFrame);

  const shelfHexes = ['#facc15', '#ef4444', '#22c55e', '#38bdf8', '#a855f7'];
  const shelfJarMats = shelfHexes.map((col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.25 }));
  const shelfBoxMats = shelfHexes.map((col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.45 }));
  const oilBottleGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.44, 14);
  const groceryBoxGeo = new THREE.BoxGeometry(0.38, 0.36, 0.44);

  for (let tier = 0; tier < 3; tier++) {
    const sy = 0.65 + tier * 0.78;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.08, 9.5), crateMat);
    shelf.position.set(46.9, sy, 0);
    group.add(shelf);

    // Oil Bottles, Spice Jars & Grocery Boxes on each shelf
    for (let k = -4; k <= 4; k++) {
      const matIdx = (Math.abs(k) + tier) % shelfHexes.length;
      const item =
        tier === 0
          ? new THREE.Mesh(oilBottleGeo, shelfJarMats[matIdx])
          : new THREE.Mesh(groceryBoxGeo, shelfBoxMats[matIdx]);
      item.position.set(46.7, sy + 0.25, k * 1.0);
      group.add(item);
    }
  }

  // Open Burlap Miniket Rice & Red Lentil Sacks (Chaler Bosta) at North End of Counter
  const sackGeo = new THREE.CylinderGeometry(0.42, 0.48, 0.85, 18);
  const riceSack = new THREE.Mesh(sackGeo, sackMat);
  riceSack.position.set(43.2, 0.425, -6.1);
  riceSack.castShadow = !isSoftwareGl;
  const riceHeap = new THREE.Mesh(new THREE.SphereGeometry(0.39, 14, 10), riceMat);
  riceHeap.scale.set(1, 0.45, 1);
  riceHeap.position.set(43.2, 0.84, -6.1);

  const dalSack = new THREE.Mesh(sackGeo, sackMat);
  dalSack.position.set(44.4, 0.425, -6.1);
  dalSack.castShadow = !isSoftwareGl;
  const dalHeap = new THREE.Mesh(new THREE.SphereGeometry(0.39, 14, 10), dalMat);
  dalHeap.scale.set(1, 0.45, 1);
  dalHeap.position.set(44.4, 0.84, -6.1);
  group.add(riceSack, riceHeap, dalSack, dalHeap);

  // Authentic Hanging Brass Balance Scale (Daripalla) + Cash Box on Bazar Counter
  const scaleStand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.85, 12), brassMat);
  scaleStand.position.set(43.8, 1.62, -1.2);
  const scaleBeam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.96), brassMat);
  scaleBeam.position.set(43.8, 2.02, -1.2);
  for (const panZ of [-1.62, -0.78]) {
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.06, 16), brassMat);
    pan.position.set(43.8, 1.56, panZ);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6), brassMat);
    cord.position.set(43.8, 1.79, panZ);
    group.add(pan, cord);
  }
  const cashBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.44), rackWood);
  cashBox.position.set(44.2, 1.34, 2.5);
  group.add(scaleStand, scaleBeam, cashBox);

  // Silver Hilsa (Ilish) Fish Ice Display Tray on Counter
  const iceTray = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.16, 1.75),
    new THREE.MeshStandardMaterial({ color: '#bae6fd', roughness: 0.18 }),
  );
  iceTray.position.set(43.5, 1.28, 0.4);
  const fishMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.18, metalness: 0.82 });
  for (let f = 0; f < 3; f++) {
    const fish = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.48, 8, 12), fishMat);
    fish.rotation.x = Math.PI / 2;
    fish.rotation.z = 0.22 * (f - 1);
    fish.scale.set(0.65, 1, 1.3);
    fish.position.set(43.5 + (f - 1) * 0.24, 1.38, 0.4);
    group.add(fish);
  }
  group.add(iceTray);

  // Hanging Enamel Warm Market Bulbs under Striped Awning
  const bulbMat = new THREE.MeshStandardMaterial({
    color: '#fef9c3',
    emissive: '#fde047',
    emissiveIntensity: 0.32,
    roughness: 0.22,
  });
  const shadeMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.4 });
  for (const lz of [-3.2, 0, 3.2]) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 6), rackWood);
    cord.position.set(42.2, 2.72, lz);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.14, 14), shadeMat);
    shade.position.set(42.2, 2.48, lz);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), bulbMat);
    bulb.position.set(42.2, 2.38, lz);
    group.add(cord, shade, bulb);
  }

  // Woven Bamboo Jhuri Baskets with Hi-Poly Real Fruits & Vegetables
  const basketPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.32, 0),
    new THREE.Vector2(0.52, 0.36),
    new THREE.Vector2(0.46, 0.38),
    new THREE.Vector2(0.28, 0.04),
    new THREE.Vector2(0.01, 0.04),
  ];
  const basketGeo = new THREE.LatheGeometry(basketPts, 20);

  const tomatoMat = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.32 });
  const eggplantMat = new THREE.MeshStandardMaterial({ color: '#7e22ce', roughness: 0.28 });
  const cauliflowerMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.72 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.65 });
  const pumpkinMat = new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.48 });

  for (let i = 0; i < 4; i++) {
    const cz = -3.3 + i * 2.2;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.52, 1.45), crateMat);
    crate.position.set(41.5, 0.26, cz);
    crate.castShadow = !isSoftwareGl;
    group.add(crate);

    const basket = new THREE.Mesh(basketGeo, basketMat);
    basket.position.set(41.5, 0.52, cz);
    group.add(basket);

    if (i === 0) {
      // Tomatoes
      for (let v = 0; v < 7; v++) {
        const va = (v / 7) * Math.PI * 2;
        const vr = v === 0 ? 0 : 0.22;
        const item = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), tomatoMat);
        item.position.set(41.5 + Math.cos(va) * vr, 0.76, cz + Math.sin(va) * vr);
        group.add(item);
      }
    } else if (i === 1) {
      // Cauliflowers (Fulkopi)
      for (let v = 0; v < 4; v++) {
        const va = (v / 4) * Math.PI * 2;
        const px = 41.5 + Math.cos(va) * 0.16;
        const pz = cz + Math.sin(va) * 0.16;
        const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), cauliflowerMat);
        head.position.set(px, 0.8, pz);
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.12, 0.1, 8), leafMat);
        collar.position.set(px, 0.72, pz);
        group.add(head, collar);
      }
    } else if (i === 2) {
      // Glossy Purple Eggplants (Begun)
      for (let v = 0; v < 5; v++) {
        const va = (v / 5) * Math.PI * 2;
        const eg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.22, 8, 12), eggplantMat);
        eg.rotation.z = 0.9;
        eg.rotation.y = va;
        eg.position.set(41.5 + Math.cos(va) * 0.16, 0.78, cz + Math.sin(va) * 0.16);
        group.add(eg);
      }
    } else {
      // Misti Kumra (Pumpkins)
      for (let v = 0; v < 3; v++) {
        const va = (v / 3) * Math.PI * 2;
        const pump = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), pumpkinMat);
        pump.scale.set(1.15, 0.78, 1.15);
        pump.position.set(41.5 + Math.cos(va) * 0.18, 0.8, cz + Math.sin(va) * 0.18);
        group.add(pump);
      }
    }
  }

  return optimizeStaticGroup(group);
}

export function createRickshawGarageProps(textures: ProceduralTextureSet, isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.36, metalness: 0.78 });
  const redTankMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.28, metalness: 0.55 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.8 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.2, metalness: 0.88 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.25, metalness: 0.85 });

  // 1. Air Compressor & Tire Pump Station near North Wall (32.5, -39.2)
  const compGrp = new THREE.Group();
  compGrp.position.set(32.5, 0, -39.2);
  const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.95, 10, 18), redTankMat);
  tank.rotation.z = Math.PI / 2;
  tank.position.set(0, 0.44, 0);
  tank.castShadow = !isSoftwareGl;
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 16), steelMat);
  motor.position.set(-0.22, 0.92, 0);
  const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16), brassMat);
  gauge.rotation.x = Math.PI / 2;
  gauge.position.set(0.35, 0.96, 0.12);
  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.4, 0.85, 0.1),
    new THREE.Vector3(0.85, 0.42, 0.5),
    new THREE.Vector3(0.65, 0.12, 1.25),
    new THREE.Vector3(1.1, 0.1, 1.65),
  ]);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 18, 0.035, 8, false), rubberMat);
  compGrp.add(tank, motor, gauge, hose);
  group.add(compGrp);

  // 2. Mechanic Tool Workbench + Pegboard Wrenches along East Wall (43.2, -29.0)
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 4.6), woodMat);
  bench.position.set(43.2, 0.475, -29.0);
  bench.castShadow = !isSoftwareGl;
  const pegboard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 4.4), steelMat);
  pegboard.position.set(43.9, 1.65, -29.0);
  const toolBox = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.36, 0.95), redTankMat);
  toolBox.position.set(43.1, 1.12, -27.8);
  group.add(bench, pegboard, toolBox);

  // Hanging Wrenches on Pegboard + Grease Can
  for (let w = 0; w < 5; w++) {
    const wrench = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.1), rimMat);
    wrench.position.set(43.8, 1.68, -30.4 + w * 0.55);
    group.add(wrench);
  }

  // 3. Stacked Spare Rickshaw Tires & Chrome Wheels near East Wall
  for (let i = 0; i < 3; i++) {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.09, 14, 24), rubberMat);
    tire.rotation.x = Math.PI / 2;
    tire.position.set(43.0, 0.11 + i * 0.18, -33.2);
    group.add(tire);
  }
  const uprightWheel = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.075, 14, 28), rubberMat);
  uprightWheel.rotation.y = Math.PI / 2 - 0.15;
  uprightWheel.position.set(43.4, 0.46, -25.4);
  const uprightRim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.025, 10, 24), rimMat);
  uprightRim.rotation.y = Math.PI / 2 - 0.15;
  uprightRim.position.copy(uprightWheel.position);
  group.add(uprightWheel, uprightRim);

  return optimizeStaticGroup(group);
}

export function createDescoTransformer(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): { group: THREE.Group; exhaustFan: THREE.Group } {
  const group = new THREE.Group();
  const cabinetMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.4, metalness: 0.74 });
  const finMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.35, metalness: 0.82 });
  const dangerMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.45 });
  const copperMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.25, metalness: 0.88 });
  const glowRed = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#ef4444',
    emissiveIntensity: 0.45,
    roughness: 0.25,
  });
  const glowGreen = new THREE.MeshStandardMaterial({
    color: '#22c55e',
    emissive: '#16a34a',
    emissiveIntensity: 0.35,
    roughness: 0.25,
  });

  // Main Transformer Core (positioned at local origin -> placed at -38.25, 0, 32.65 in WorldScene)
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.15, 3.8), cabinetMat);
  body.position.y = 1.075;
  body.castShadow = !isSoftwareGl;
  group.add(body);

  for (let f = -1.6; f <= 1.6; f += 0.4) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.65, 4.06), finMat);
    fin.position.set(f, 1.05, 0);
    group.add(fin);
  }

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.28, 0.24, 3.88), dangerMat);
  stripe.position.y = 1.72;
  group.add(stripe);

  const insPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.2, 0),
    new THREE.Vector2(0.12, 0.16),
    new THREE.Vector2(0.22, 0.32),
    new THREE.Vector2(0.12, 0.48),
    new THREE.Vector2(0.16, 0.66),
    new THREE.Vector2(0.01, 0.66),
  ];
  const insGeo = new THREE.LatheGeometry(insPts, 18);
  for (const ix of [-1.1, 0, 1.1]) {
    const ins = new THREE.Mesh(insGeo, dangerMat);
    ins.position.set(ix, 2.15, 0);
    group.add(ins);
  }

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 14), glowRed);
  beacon.position.set(0, 2.95, 0);
  group.add(beacon);

  // East-Wall High-Voltage Switchgear Breaker Cabinet (relative to -38.25, 32.65 -> +11.45, 0, 0 -> x=-26.8)
  const switchPanel = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.55, 4.6), cabinetMat);
  switchPanel.position.set(11.4, 1.275, 0);
  switchPanel.castShadow = !isSoftwareGl;
  group.add(switchPanel);

  for (let m = 0; m < 4; m++) {
    const mz = -1.6 + m * 1.05;
    const meter = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16), glowGreen);
    meter.rotation.z = Math.PI / 2;
    meter.position.set(10.82, 1.9, mz);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.32), glowRed);
    lever.position.set(10.78, 1.35, mz);
    const busbar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.2, 10), copperMat);
    busbar.position.set(11.2, 2.85, mz);
    group.add(meter, lever, busbar);
  }

  // Rotating Industrial Cooling Exhaust Fan on West Wall
  const exhaustFan = createCeilingFan('#eab308');
  exhaustFan.rotation.z = Math.PI / 2;
  exhaustFan.position.set(-5.4, 2.0, -3.5);
  group.add(exhaustFan);

  // Wooden Cable Drum Spool & Orange Safety Cones inside NW Powerhouse
  const cableSpool = new THREE.Group();
  cableSpool.position.set(-4.1, 0, -6.4);
  const fl1 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 20), dangerMat);
  fl1.rotation.z = Math.PI / 2;
  fl1.position.set(-0.35, 0.7, 0);
  const fl2 = fl1.clone();
  fl2.position.x = 0.35;
  const cableCore = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.65, 20), finMat);
  cableCore.rotation.z = Math.PI / 2;
  cableCore.position.y = 0.7;
  cableSpool.add(fl1, fl2, cableCore);
  group.add(cableSpool);

  return { group: optimizeStaticGroup(group, [exhaustFan]), exhaustFan };
}

export function createDishHub(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): { group: THREE.Group; serverLeds: THREE.MeshBasicMaterial[] } {
  const group = new THREE.Group();
  const deskMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.42, metalness: 0.5 });
  const chairMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.6 });
  const screenMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: '#0284c7',
    emissiveIntensity: 0.45,
    roughness: 0.18,
  });
  const metalMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.2, metalness: 0.88 });
  const serverLeds: THREE.MeshBasicMaterial[] = [];

  // Desk (32.5..37.5, 33.2..35.8)
  const desk = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.12, 2.2), deskMat);
  desk.position.set(35.0, 0.56, 34.5);
  desk.castShadow = !isSoftwareGl;
  group.add(desk);

  // Triple Control Room Monitors + Wi-Fi Multi-Antenna Routers on Desk
  for (const mx of [33.4, 35.0, 36.6]) {
    const mon = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.72, 0.12), screenMat);
    mon.position.set(mx, 1.54, 34.4);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 0.28, 12), metalMat);
    stand.position.set(mx, 1.24, 34.4);
    group.add(mon, stand);
  }
  const router = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.38), deskMat);
  router.position.set(34.5, 1.19, 33.7);
  for (const ax of [-0.24, 0, 0.24]) {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.42, 8), deskMat);
    ant.position.set(34.5 + ax, 1.44, 33.7);
    group.add(ant);
  }
  group.add(router);

  // Operator Rolling Swivel Chair in front of Desk (35.0, 32.1)
  const chair = new THREE.Group();
  chair.position.set(35.0, 0, 32.1);
  const cBase = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.1, 14), metalMat);
  cBase.position.y = 0.08;
  const cStem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 10), metalMat);
  cStem.position.y = 0.3;
  const cSeat = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.14, 0.65), chairMat);
  cSeat.position.y = 0.52;
  const cBack = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.72, 0.12), chairMat);
  cBack.position.set(0, 0.92, -0.28);
  chair.add(cBase, cStem, cSeat, cBack);
  group.add(chair);

  // Tall 42U ISP Fiber & Server Rack along East Wall (43.2, 33.8)
  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.75, 3.6), deskMat);
  rack.position.set(43.2, 1.375, 33.8);
  rack.castShadow = !isSoftwareGl;
  group.add(rack);

  for (let blade = 0; blade < 6; blade++) {
    const ledMat = new THREE.MeshBasicMaterial({ color: blade % 2 === 0 ? '#22c55e' : '#38bdf8' });
    serverLeds.push(ledMat);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 2.9), ledMat);
    strip.position.set(42.48, 0.48 + blade * 0.38, 33.8);
    group.add(strip);
  }

  // Coiled Black Coaxial Cable Reels under South-East Wall
  const reelMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.75 });
  for (let r = 0; r < 2; r++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.12, 12, 24), reelMat);
    coil.rotation.x = Math.PI / 2;
    coil.position.set(40.8, 0.14 + r * 0.22, 38.2);
    group.add(coil);
  }

  // Parabolic Roof Dish Antenna + LNB Feed Horn
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 3.2, 18), metalMat);
  mast.position.set(40.2, 1.6, 37.5);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.3, side: THREE.DoubleSide }),
  );
  dish.position.set(40.2, 3.4, 37.5);
  dish.rotation.x = Math.PI * 0.72;
  dish.rotation.z = -0.35;
  const feedArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.35, 10), metalMat);
  feedArm.position.set(40.5, 3.9, 36.8);
  feedArm.rotation.x = 0.9;
  group.add(mast, dish, feedArm);

  return { group: optimizeStaticGroup(group), serverLeds };
}

export function createFuchkaCartModel(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
  isLiteMaterial = isSoftwareGl,
): THREE.Group {
  const group = new THREE.Group();
  const cartWood = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.72 });
  const redFrame = new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.36, metalness: 0.45 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.2, metalness: 0.85 });
  const steelMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.2, metalness: 0.88 });
  const glassMat = isLiteMaterial
    ? new THREE.MeshStandardMaterial({
        color: '#e0f2fe',
        roughness: 0.1,
        metalness: 0.22,
        transparent: true,
        opacity: 0.48,
      })
    : new THREE.MeshPhysicalMaterial({
        color: '#e0f2fe',
        roughness: 0.08,
        metalness: 0.1,
        clearcoat: 1.0,
        transparent: true,
        opacity: 0.48,
      });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.92, metalness: 0.0 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.25, metalness: 0.82 });
  const purisMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.65 });
  const tokMat = new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.25 });

  // Lower Cart Chassis + Spoked Wheels
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.96, 2.2), redFrame);
  chassis.position.set(0, 0.68, 0);
  chassis.castShadow = !isSoftwareGl;
  chassis.receiveShadow = true;
  group.add(chassis);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.12, 2.45), cartWood);
  counterTop.position.set(0, 1.2, 0);
  counterTop.receiveShadow = true;
  group.add(counterTop);

  for (const wx of [-2.45, 2.45]) {
    for (const wz of [-0.7, 0.7]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 12, 24), tireMat);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(wx, 0.36, wz);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12), rimMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(wx, 0.36, wz);
      group.add(wheel, hub);
    }
  }

  // Glass Showcase Box filled with Stacked Golden Fuchka Puri Shells
  const showcase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.4), glassMat);
  showcase.position.set(-1.3, 1.72, 0);
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.08, 1.48), brassMat);
  frameTop.position.set(-1.3, 2.18, 0);
  group.add(showcase, frameTop);

  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 6; i++) {
      const puri = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 10), purisMat);
      puri.scale.set(1.15, 0.88, 1.15);
      puri.position.set(-1.95 + i * 0.25 + (row % 2) * 0.08, 1.38 + row * 0.17, (i % 2 === 0 ? 0.24 : -0.24));
      group.add(puri);
    }
  }

  // Hot Chotpoti Tawa Bowl + Charcoal Glow at Center (x=0.25)
  const chotpotiPan = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.32, 0.18, 22), brassMat);
  chotpotiPan.position.set(0.25, 1.34, 0);
  const dabliFill = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.05, 20),
    new THREE.MeshStandardMaterial({ color: '#ca8a04', roughness: 0.45 }),
  );
  dabliFill.position.set(0.25, 1.42, 0);
  group.add(chotpotiPan, dabliFill);

  // Chopped Onion / Chili / Coriander Condiment Bowls + Stacked Steel Plates
  const bowlCols = ['#f8fafc', '#16a34a', '#dc2626'];
  for (let b = 0; b < 3; b++) {
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.12, 0.12, 14),
      steelMat,
    );
    bowl.position.set(-0.2 + b * 0.42, 1.32, 0.72);
    const fill = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 10, 8),
      new THREE.MeshStandardMaterial({ color: bowlCols[b], roughness: 0.75 }),
    );
    fill.scale.set(1, 0.45, 1);
    fill.position.set(-0.2 + b * 0.42, 1.37, 0.72);
    group.add(bowl, fill);
  }
  const plateStack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.24, 16), steelMat);
  plateStack.position.set(0.85, 1.38, -0.68);
  group.add(plateStack);

  // LatheGeometry Brass Tamarind Tok Hari Pot
  const hariPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.28, 0),
    new THREE.Vector2(0.46, 0.26),
    new THREE.Vector2(0.38, 0.52),
    new THREE.Vector2(0.26, 0.62),
    new THREE.Vector2(0.32, 0.68),
    new THREE.Vector2(0.01, 0.68),
  ];
  const hari = new THREE.Mesh(new THREE.LatheGeometry(hariPts, 24), brassMat);
  hari.position.set(1.45, 1.26, 0);
  const tokLiquid = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 18), tokMat);
  tokLiquid.position.set(1.45, 1.9, 0);
  group.add(hari, tokLiquid);

  // Water Dispenser Jar on Right Edge
  const waterJug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.54, 16),
    new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.2, transparent: true, opacity: 0.8 }),
  );
  waterJug.position.set(2.15, 1.53, 0.65);
  group.add(waterJug);

  // Corner Poles + Striped Festive Canopy + Illuminated Fuchka Signboard
  for (const px of [-2.3, 2.3]) {
    for (const pz of [-1.0, 1.0]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 2.2, 12), brassMat);
      pole.position.set(px, 2.3, pz);
      group.add(pole);
    }
  }
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 0.16, 2.9),
    new THREE.MeshStandardMaterial({ map: textures.bazarAwningMap, roughness: 0.48 }),
  );
  awning.position.set(0, 3.45, 0);
  awning.rotation.x = 0.08;
  awning.castShadow = !isSoftwareGl;
  group.add(awning);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 1.2, 0.16),
    new THREE.MeshStandardMaterial({ map: textures.fuchkaSignMap, roughness: 0.4 }),
  );
  sign.position.set(0, 4.15, 1.22);
  group.add(sign);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 14, 14),
    new THREE.MeshStandardMaterial({
      color: '#fef9c3',
      emissive: '#fde047',
      emissiveIntensity: 0.32,
      roughness: 0.22,
    }),
  );
  bulb.position.set(0, 3.25, 0.2);
  group.add(bulb);

  // Standing Eating Tables & Colorful Plastic Moras flanking the Cart
  const moraColors = ['#e11d48', '#2563eb', '#f59e0b'];
  moraColors.forEach((hex, idx) => {
    const mora = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.3, 0.38, 18),
      new THREE.MeshStandardMaterial({ color: hex, roughness: 0.44 }),
    );
    mora.position.set(-1.6 + idx * 1.6, 0.19, 2.4);
    mora.castShadow = !isSoftwareGl;
    group.add(mora);
  });
  for (const tx of [-5.8, 5.8]) {
    const tTop = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.08, 20), steelMat);
    tTop.position.set(tx, 1.05, 1.6);
    const tLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.18, 1.04, 12), redFrame);
    tLeg.position.set(tx, 0.52, 1.6);
    group.add(tTop, tLeg);
  }

  group.position.set(0, 0, -68.0);
  return optimizeStaticGroup(group);
}

export function createSaloonProps(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): { group: THREE.Group; barberPole: THREE.Group; ceilingFan: THREE.Group } {
  const group = new THREE.Group();
  const counterMat = new THREE.MeshStandardMaterial({ color: '#831843', roughness: 0.38, metalness: 0.25 });
  const marbleMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.22 });
  const mirrorMat = new THREE.MeshStandardMaterial({
    color: '#bae6fd',
    roughness: 0.08,
    metalness: 0.92,
  });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.16, metalness: 0.92 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: '#be123c', roughness: 0.48 });
  const sofaMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.55 });
  const towelMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.85 });

  // Barber Counter + Illuminated Mirror Wall inside Saloon (-73.8..-71.8, z -32..-20)
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.05, 11.4), counterMat);
  counter.position.set(-72.8, 0.525, -26.0);
  counter.castShadow = !isSoftwareGl;
  const topSlab = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.12, 11.6), marbleMat);
  topSlab.position.set(-72.8, 1.1, -26.0);
  group.add(counter, topSlab);

  for (const mz of [-29.5, -26.0, -22.5]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.55, 2.2), mirrorMat);
    mirror.position.set(-73.95, 2.1, mz);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.66, 2.34), chromeMat);
    frame.position.set(-74.0, 2.1, mz);
    const sconce = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.12, 1.4),
      new THREE.MeshStandardMaterial({
        color: '#fef9c3',
        emissive: '#fde047',
        emissiveIntensity: 0.32,
        roughness: 0.22,
      }),
    );
    sconce.position.set(-73.82, 2.95, mz);
    group.add(mirror, frame, sconce);

    // Salon Tools on Marble Counter per Station (Perfume Spray, Trimmer, Talc Tin, Rolled Towels)
    const perfume = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 0.24, 14),
      new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.15 }),
    );
    perfume.position.set(-72.4, 1.28, mz - 0.55);
    const trimmer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.038, 0.22, 10),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.35 }),
    );
    trimmer.position.set(-72.4, 1.27, mz + 0.45);
    const towel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.34, 12), towelMat);
    towel.rotation.x = Math.PI / 2;
    towel.position.set(-72.4, 1.24, mz);
    group.add(perfume, trimmer, towel);

    // Hi-Poly Chrome Hydraulic Barber Chair facing Mirror
    const basePts = [
      new THREE.Vector2(0.01, 0),
      new THREE.Vector2(0.42, 0),
      new THREE.Vector2(0.36, 0.08),
      new THREE.Vector2(0.12, 0.14),
      new THREE.Vector2(0.12, 0.46),
      new THREE.Vector2(0.01, 0.46),
    ];
    const chair = new THREE.Group();
    chair.position.set(-70.2, 0, mz);
    const ped = new THREE.Mesh(new THREE.LatheGeometry(basePts, 20), chromeMat);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.18, 0.72), leatherMat);
    seat.position.y = 0.54;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.68), leatherMat);
    back.position.set(0.32, 0.92, 0);
    const headRest = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.34), leatherMat);
    headRest.position.set(0.34, 1.38, 0);
    // Chrome Armrests + Footrest Loop
    for (const az of [-0.4, 0.4]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.09), chromeMat);
      arm.position.set(0.02, 0.76, az);
      chair.add(arm);
    }
    const footRest = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.54), chromeMat);
    footRest.position.set(-0.48, 0.24, 0);
    chair.add(ped, seat, back, headRest, footRest);
    group.add(chair);
  }

  // Waiting Sofa Bench along South Wall (-66.5, -18.8) + Split AC Unit on North Wall + Hairstyle Posters
  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.44, 1.05), sofaMat);
  sofaBase.position.set(-66.5, 0.22, -18.7);
  sofaBase.castShadow = !isSoftwareGl;
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.55, 0.2), leatherMat);
  sofaBack.position.set(-66.5, 0.68, -18.2);
  group.add(sofaBase, sofaBack);

  const acUnit = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 0.46), marbleMat);
  acUnit.position.set(-66.5, 2.55, -33.7);
  const stylePoster = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.75, 0.08),
    new THREE.MeshStandardMaterial({ map: textures.saloonPosterMap, roughness: 0.45 }),
  );
  stylePoster.position.set(-69.5, 1.85, -33.95);
  group.add(acUnit, stylePoster);

  // Spinning Candy-Striped Barber Pole outside East Entrance
  const barberPole = new THREE.Group();
  barberPole.position.set(-56.6, 2.0, -21.2);
  const poleBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 1.35, 20),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.2 }),
  );
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), chromeMat);
  capTop.position.y = 0.74;
  const capBot = capTop.clone();
  capBot.position.y = -0.74;
  barberPole.add(poleBody, capTop, capBot);
  const redStripeMat = new THREE.MeshStandardMaterial({ color: '#e11d48', emissive: '#9f1239', emissiveIntensity: 0.35 });
  const blueStripeMat = new THREE.MeshStandardMaterial({ color: '#2563eb', emissive: '#1e40af', emissiveIntensity: 0.35 });
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.045, 8, 20),
      i % 2 === 0 ? redStripeMat : blueStripeMat,
    );
    ring.rotation.x = Math.PI / 2 - 0.35;
    ring.position.y = -0.5 + i * 0.2;
    barberPole.add(ring);
  }
  group.add(barberPole);

  const ceilingFan = createCeilingFan('#be123c');
  ceilingFan.position.set(-65.5, 3.35, -26.0);
  group.add(ceilingFan);

  return {
    group: optimizeStaticGroup(group, [barberPole, ceilingFan]),
    barberPole,
    ceilingFan,
  };
}

export function createCricketMathProps(textures: ProceduralTextureSet, isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const pitchMat = new THREE.MeshStandardMaterial({ color: '#d6bfa3', roughness: 0.9 });
  const lineMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.5 });
  const woodMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.5 });
  const darkWood = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.8 });
  const neonMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    emissive: '#fde68a',
    emissiveIntensity: 0.28,
    roughness: 0.25,
  });
  const towerMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.42, metalness: 0.72 });
  const benchGreen = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.48 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.7 });

  // Clay Cricket Pitch Strip + White Crease Markings
  const pitch = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 15.0), pitchMat);
  pitch.position.set(64.5, 0.04, -26.0);
  pitch.receiveShadow = true;
  group.add(pitch);

  for (const cz of [-31.8, -20.2]) {
    const crease = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.072, 0.14), lineMat);
    crease.position.set(64.5, 0.045, cz);
    group.add(crease);

    for (const sx of [-0.22, 0, 0.22]) {
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.82, 10), woodMat);
      stump.position.set(64.5 + sx, 0.44, cz);
      stump.castShadow = !isSoftwareGl;
      group.add(stump);
    }
    for (const bx of [-0.11, 0.11]) {
      const bail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), darkWood);
      bail.rotation.z = Math.PI / 2;
      bail.position.set(64.5 + bx, 0.87, cz);
      group.add(bail);
    }
  }

  // Dugout Bench + Drinks Cooler + Cricket Kit Bag + Scoreboard
  const dugoutSeat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.48, 8.6), benchGreen);
  dugoutSeat.position.set(73.1, 0.24, -26.0);
  dugoutSeat.castShadow = !isSoftwareGl;
  const dugoutBack = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.35, 8.8), towerMat);
  dugoutBack.position.set(73.9, 0.72, -26.0);
  const dugoutRoof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 9.2), benchGreen);
  dugoutRoof.position.set(73.1, 2.35, -26.0);
  dugoutRoof.rotation.z = -0.18;
  for (const pz of [-30.0, -22.0]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 2.35, 10), towerMat);
    post.position.set(72.3, 1.18, pz);
    group.add(post);
  }
  group.add(dugoutSeat, dugoutBack, dugoutRoof);

  // Ice Drinks Cooler + Kit Bag + Helmet beside Dugout
  const cooler = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.56, 0.95),
    new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.35 }),
  );
  cooler.position.set(72.9, 0.76, -23.0);
  const kitBag = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.9, 8, 12),
    new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.65 }),
  );
  kitBag.rotation.x = Math.PI / 2;
  kitBag.position.set(72.7, 0.72, -28.8);
  group.add(cooler, kitBag);

  // Manual Wooden Moholla Cricket Scoreboard at North Edge (65.0, -36.2)
  const sbBoard = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 2.1, 0.18),
    new THREE.MeshStandardMaterial({ map: textures.scoreboardMap, roughness: 0.45 }),
  );
  sbBoard.position.set(65.0, 2.15, -36.2);
  for (const sx of [63.5, 66.5]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 10), darkWood);
    leg.position.set(sx, 1.1, -36.2);
    group.add(leg);
  }
  group.add(sbBoard);

  // Boundary Net Posts & Tension Ropes along East edge
  for (let nz = -35; nz <= -17; nz += 4.5) {
    const netPost = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 2.6, 10), towerMat);
    netPost.position.set(74.6, 1.3, nz);
    group.add(netPost);
  }
  for (const ry of [1.2, 2.2]) {
    const netLine = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 18.0, 6), ropeMat);
    netLine.rotation.x = Math.PI / 2;
    netLine.position.set(74.6, ry, -26.0);
    group.add(netLine);
  }

  // Leaning Wooden Cricket Bat + Tape-Wrapped Tennis Ball
  const batBlade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.78, 0.06), woodMat);
  batBlade.position.set(66.8, 0.42, -21.2);
  batBlade.rotation.z = -0.25;
  const batHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.38, 10), darkWood);
  batHandle.position.set(66.92, 0.92, -21.2);
  batHandle.rotation.z = -0.25;
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 12, 12),
    new THREE.MeshStandardMaterial({ color: '#fde047', roughness: 0.4 }),
  );
  ball.position.set(66.4, 0.14, -21.0);
  group.add(batBlade, batHandle, ball);

  // Stadium Floodlight Mast + Signboard
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 7.6, 14), towerMat);
  mast.position.set(73.2, 3.8, -34.2);
  const lampHead = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.35), towerMat);
  lampHead.position.set(72.9, 7.6, -34.0);
  lampHead.rotation.y = -0.6;
  const lampGlow = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.7, 0.1), neonMat);
  lampGlow.position.set(72.75, 7.6, -33.85);
  lampGlow.rotation.y = -0.6;
  group.add(mast, lampHead, lampGlow);

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 1.25, 4.4),
    new THREE.MeshStandardMaterial({ map: textures.cricketSignMap, roughness: 0.4 }),
  );
  sign.position.set(73.1, 3.25, -26.0);
  group.add(sign);

  return optimizeStaticGroup(group);
}

export function createPharmacyProps(textures: ProceduralTextureSet, isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const cabinetMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.28 });
  const tealTrim = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.35 });
  const steelMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.2, metalness: 0.88 });
  const crossGreen = new THREE.MeshStandardMaterial({
    color: '#22c55e',
    emissive: '#16a34a',
    emissiveIntensity: 0.4,
    roughness: 0.25,
  });
  const bottleMats = [
    new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.18 }),
    new THREE.MeshStandardMaterial({ color: '#fb7185', roughness: 0.18 }),
    new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.18 }),
    new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.18 }),
  ];

  // Glass Pharmacy Counter (pharm_counter -73.8..-71.6, z 20..32)
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.15, 11.4), cabinetMat);
  counter.position.set(-72.7, 0.575, 26.0);
  counter.castShadow = !isSoftwareGl;
  const topTrim = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 11.5), tealTrim);
  topTrim.position.set(-72.7, 1.18, 26.0);
  group.add(counter, topTrim);

  // Tall Back Medicine Rack Shelving (x=-73.95) packed with Tablet Boxes & Syrup Bottles
  const backRack = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.85, 11.2), cabinetMat);
  backRack.position.set(-73.85, 1.425, 26.0);
  group.add(backRack);

  for (let tier = 0; tier < 3; tier++) {
    const sy = 1.45 + tier * 0.58;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.06, 11.0), tealTrim);
    shelf.position.set(-73.75, sy, 26.0);
    group.add(shelf);
    for (let m = 0; m < 12; m++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.34, 0.62),
        bottleMats[(m + tier) % bottleMats.length],
      );
      box.position.set(-73.68, sy + 0.2, 21.0 + m * 0.9);
      group.add(box);
    }
  }

  // Counter Syrup Bottles, Digital Cash Register & First-Aid Red Cross Box
  const bottlePts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.12, 0),
    new THREE.Vector2(0.12, 0.28),
    new THREE.Vector2(0.06, 0.34),
    new THREE.Vector2(0.06, 0.42),
    new THREE.Vector2(0.01, 0.42),
  ];
  const bottleGeo = new THREE.LatheGeometry(bottlePts, 14);
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Mesh(bottleGeo, bottleMats[i % bottleMats.length]);
    b.position.set(-72.2, 1.25, 21.4 + i * 1.15);
    group.add(b);
  }
  const register = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.42, 0.68),
    new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4 }),
  );
  register.position.set(-72.5, 1.46, 30.8);
  const firstAid = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.34, 0.68), cabinetMat);
  firstAid.position.set(-72.6, 1.42, 20.6);
  const aidCross = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.16, 0.16),
    new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.4 }),
  );
  aidCross.position.set(-72.6, 1.44, 20.6);
  group.add(register, firstAid, aidCross);

  // Glowing Vaccine Mini-Fridge (-72.6, 18.6) & Saline IV Drip Stand (-70.4, 20.4)
  const vFridge = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.1, 1.1), cabinetMat);
  vFridge.position.set(-72.6, 1.05, 18.6);
  vFridge.castShadow = !isSoftwareGl;
  const vDoor = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 1.55, 0.85),
    new THREE.MeshStandardMaterial({
      color: '#e0f2fe',
      emissive: '#0ea5e9',
      emissiveIntensity: 0.25,
      roughness: 0.18,
    }),
  );
  vDoor.position.set(-71.88, 1.1, 18.6);
  group.add(vFridge, vDoor);

  const ivBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 12), steelMat);
  ivBase.position.set(-70.4, 0.04, 20.4);
  const ivPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 2.25, 10), steelMat);
  ivPole.position.set(-70.4, 1.15, 20.4);
  const ivBag = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.11, 0.22, 6, 10),
    new THREE.MeshStandardMaterial({ color: '#bae6fd', roughness: 0.2, transparent: true, opacity: 0.82 }),
  );
  ivBag.position.set(-70.24, 2.02, 20.4);
  group.add(ivBase, ivPole, ivBag);

  // Patient Waiting Bench along North Wall (-66.5, 18.7)
  const waitBench = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.48, 0.95), tealTrim);
  waitBench.position.set(-66.5, 0.24, 18.7);
  waitBench.castShadow = !isSoftwareGl;
  group.add(waitBench);

  // Glowing Pharmacy Cross Beacon & Signboard at East Facade
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.34), crossGreen);
  crossV.position.set(-56.7, 3.6, 20.6);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, 1.2), crossGreen);
  crossH.position.set(-56.7, 3.6, 20.6);
  group.add(crossV, crossH);

  return optimizeStaticGroup(group);
}

export function createBiyerPandalProps(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): { group: THREE.Group; wooferCones: THREE.Mesh[] } {
  const group = new THREE.Group();
  const stageMat = new THREE.MeshStandardMaterial({ color: '#9f1239', roughness: 0.42 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.22, metalness: 0.82 });
  const carpetMat = new THREE.MeshStandardMaterial({ color: '#be123c', roughness: 0.88 });
  const speakerMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.45, metalness: 0.5 });
  const clothMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.65 });
  const coneMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: '#0284c7',
    emissiveIntensity: 0.1,
    roughness: 0.35,
  });
  const wooferCones: THREE.Mesh[] = [];

  // Raised Wedding DJ Stage (pandal_stage 70.5..74.2, z 22.5..29.5)
  const stage = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.25, 6.8), stageMat);
  stage.position.set(72.35, 0.625, 26.0);
  stage.castShadow = !isSoftwareGl;
  stage.receiveShadow = true;
  const stageTrim = new THREE.Mesh(new THREE.BoxGeometry(3.72, 0.14, 6.92), goldMat);
  stageTrim.position.set(72.35, 1.25, 26.0);
  group.add(stage, stageTrim);

  // Ornate Golden Floral Arch & Bride-Groom Velvet Sofa on Stage
  const archFrame = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.14, 12, 28, Math.PI), goldMat);
  archFrame.rotation.y = Math.PI / 2;
  archFrame.position.set(73.4, 1.32, 26.0);
  const sofa = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 2.7), stageMat);
  sofa.position.set(72.7, 1.62, 26.0);
  const djBooth = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.9, 1.8), speakerMat);
  djBooth.position.set(71.2, 1.75, 26.0);
  // DJ Turntable Decks
  for (const dz of [25.55, 26.45]) {
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 18), goldMat);
    deck.position.set(71.2, 2.23, dz);
    group.add(deck);
  }
  group.add(archFrame, sofa, djBooth);

  // Twin Towering DJ Speaker Stacks flanking Stage
  for (const sz of [21.6, 30.4]) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.2, 1.15), speakerMat);
    cab.position.set(72.0, 1.1, sz);
    cab.castShadow = !isSoftwareGl;
    group.add(cab);
    for (const cy of [0.68, 1.56]) {
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.24, 0.12, 20), coneMat);
      cone.rotation.z = Math.PI / 2;
      cone.position.set(71.38, cy, sz);
      group.add(cone);
      wooferCones.push(cone);
    }
  }

  // VIP Wedding Dining Table with White Tablecloth & Kacchi Plates (64.2, 19.8)
  const dTable = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.78, 1.5), clothMat);
  dTable.position.set(64.5, 0.39, 19.6);
  dTable.castShadow = !isSoftwareGl;
  group.add(dTable);
  for (let p = 0; p < 4; p++) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.04, 16), goldMat);
    plate.position.set(63.4 + p * 0.72, 0.8, 19.6);
    group.add(plate);
  }

  // Festive Shamiana Canopy Posts + Hanging Genda Marigold Garlands + Red Carpet Runner
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 4.2), carpetMat);
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(64.0, 0.068, 26.0);
  group.add(carpet);

  for (const px of [59.5, 73.8]) {
    for (const pz of [17.8, 34.2]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 4.2, 12), goldMat);
      pole.position.set(px, 2.1, pz);
      group.add(pole);
    }
  }

  const marigoldOrange = new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.45 });
  const marigoldYellow = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.42 });
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#be123c', roughness: 0.45 });
  const garGeo = new THREE.SphereGeometry(0.16, 10, 10);

  for (const gz of [17.8, 26.0, 34.2]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const gx = THREE.MathUtils.lerp(59.5, 73.8, t);
      const gy = 4.15 - Math.sin(t * Math.PI) * 0.95;
      pts.push(new THREE.Vector3(gx, gy, gz));
      if (i > 0 && i < 10) {
        const flower = new THREE.Mesh(garGeo, i % 2 === 0 ? marigoldOrange : marigoldYellow);
        flower.position.set(gx, gy - 0.14, gz);
        group.add(flower);
      }
    }
    const wire = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.025, 6, false),
      bulbMat,
    );
    group.add(wire);
  }

  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 1.35, 4.6),
    new THREE.MeshStandardMaterial({ map: textures.pandalSignMap, roughness: 0.4 }),
  );
  sign.position.set(59.6, 3.85, 26.0);
  group.add(sign);

  return { group: optimizeStaticGroup(group, wooferCones), wooferCones };
}

export function createPukurDetails(): { group: THREE.Group; boat: THREE.Group; flowers: THREE.Group[] } {
  const group = new THREE.Group();
  const padMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.65 });
  const petalMat = new THREE.MeshStandardMaterial({ color: '#f472b6', roughness: 0.36 });
  const centerMat = new THREE.MeshStandardMaterial({ color: '#fde047', roughness: 0.3 });
  const clayMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.72 });
  const postMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.88 });
  const bambooMat = new THREE.MeshStandardMaterial({ color: '#ca8a04', roughness: 0.68 });
  const flowers: THREE.Group[] = [];

  const lotusSpots: Array<[number, number, number]> = [
    [-44.2, -4.8, 1.1],
    [-48.0, -2.1, 0.95],
    [-44.6, 4.4, 1.2],
    [-48.4, 5.2, 1.0],
    [-46.2, -6.4, 0.9],
  ];

  for (const [lx, lz, sc] of lotusSpots) {
    const fl = new THREE.Group();
    fl.position.set(lx, 0.07, lz);
    fl.scale.setScalar(sc);

    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.03, 24), padMat);
    fl.add(pad);

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 14), centerMat);
    core.position.y = 0.09;
    fl.add(core);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const pet = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.26, 10), petalMat);
      pet.position.set(Math.cos(a) * 0.19, 0.11, Math.sin(a) * 0.19);
      pet.rotation.z = -Math.cos(a) * 0.62;
      pet.rotation.x = Math.sin(a) * 0.62;
      fl.add(pet);
    }
    group.add(fl);
    flowers.push(fl);
  }

  // Turned Clay Kolshi (Water Pitchers) on Ghat Steps
  const kolshiPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.16, 0),
    new THREE.Vector2(0.28, 0.18),
    new THREE.Vector2(0.26, 0.34),
    new THREE.Vector2(0.12, 0.44),
    new THREE.Vector2(0.18, 0.52),
    new THREE.Vector2(0.01, 0.52),
  ];
  const kolshiGeo = new THREE.LatheGeometry(kolshiPts, 24);
  for (const [kx, ky, kz] of [
    [-40.4, 0.22, -4.8],
    [-40.6, 0.22, -4.1],
  ]) {
    const k = new THREE.Mesh(kolshiGeo, clayMat);
    k.position.set(kx, ky, kz);
    group.add(k);
  }

  // Wooden Mooring Posts + Bamboo Fishing Rod + Ghat Rest Bench
  for (const pz of [-5.8, 5.8]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 1.35, 14), postMat);
    post.position.set(-41.8, 0.55, pz);
    group.add(post);
  }
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.045, 3.2, 8), bambooMat);
  rod.position.set(-42.5, 1.15, -5.8);
  rod.rotation.z = 0.78;
  group.add(rod);

  const ghatBench = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 2.8), postMat);
  ghatBench.position.set(-37.8, 0.225, -6.2);
  group.add(ghatBench);

  // Curved Wooden Nouka Boat with Woven Chhai Canopy
  const boat = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.76 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.45 });
  const chhaiMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.85 });
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 2.2, 14, 24), hullMat);
  hull.rotation.x = Math.PI / 2;
  hull.scale.set(1.18, 1.0, 0.45);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.3), trimMat);
  bench.position.y = 0.18;
  const chhai = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.56, 1.25, 20, 1, false, 0, Math.PI),
    chhaiMat,
  );
  chhai.rotation.z = Math.PI / 2;
  chhai.rotation.y = Math.PI / 2;
  chhai.position.set(0, 0.18, -0.15);
  boat.add(hull, bench, chhai);
  boat.position.set(-44.0, 0.09, 0.6);
  boat.rotation.y = 0.25;
  group.add(boat);

  return { group: optimizeStaticGroup(group, [boat, ...flowers]), boat, flowers };
}

export function createEidgahGate(isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.42 });
  const greenMat = new THREE.MeshStandardMaterial({ color: '#059669', roughness: 0.36 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.2, metalness: 0.85 });

  // Onion Dome LatheGeometry
  const domePts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.45, 0),
    new THREE.Vector2(0.64, 0.26),
    new THREE.Vector2(0.56, 0.58),
    new THREE.Vector2(0.24, 0.88),
    new THREE.Vector2(0.02, 1.08),
  ];
  const onionGeo = new THREE.LatheGeometry(domePts, 24);

  for (const px of [-4.4, 4.4]) {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 1.4), whiteMat);
    plinth.position.set(px, 0.225, 0);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 4.6, 22), whiteMat);
    pillar.position.set(px, 2.5, 0);
    pillar.castShadow = !isSoftwareGl;
    const dome = new THREE.Mesh(onionGeo, greenMat);
    dome.position.set(px, 4.8, 0);
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 12), goldMat);
    finial.position.set(px, 6.05, 0);
    group.add(plinth, pillar, dome, finial);
  }

  const arch = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.38, 16, 36, Math.PI), greenMat);
  arch.position.set(0, 3.6, 0);
  const trimArch = new THREE.Mesh(new THREE.TorusGeometry(4.0, 0.1, 10, 36, Math.PI), goldMat);
  trimArch.position.set(0, 3.6, 0);
  const centerDome = new THREE.Mesh(onionGeo, goldMat);
  centerDome.scale.setScalar(1.35);
  centerDome.position.set(0, 7.9, 0);
  group.add(arch, trimArch, centerDome);

  // Prayer Row Carpet Strips (Janamaz) on Eidgah Field (relative to 0, 0, -44.2 -> z +3..+11)
  for (let row = 0; row < 3; row++) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 1.1), greenMat);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, 0.068, 3.2 + row * 2.4);
    const trim = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 0.12), goldMat);
    trim.rotation.x = -Math.PI / 2;
    trim.position.set(0, 0.071, 2.7 + row * 2.4);
    group.add(strip, trim);
  }

  group.position.set(0, 0, -44.2);
  return optimizeStaticGroup(group);
}

export function createWaterTowerModel(isSoftwareGl: boolean): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.42, metalness: 0.76 });
  const tankMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.32, metalness: 0.32 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.38 });
  const valveMat = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.35 });

  const legs: Array<[number, number]> = [
    [-1.65, -1.65],
    [1.65, -1.65],
    [-1.65, 1.65],
    [1.65, 1.65],
  ];
  for (const [lx, lz] of legs) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.35, 0.65), trimMat);
    pad.position.set(lx, 0.175, lz);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 5.4, 14), steelMat);
    leg.position.set(lx, 2.7, lz);
    leg.castShadow = !isSoftwareGl;
    group.add(pad, leg);
  }

  for (const hy of [1.9, 3.8]) {
    for (const bz of [-1.65, 1.65]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.14, 0.14), steelMat);
      beam.position.set(0, hy, bz);
      group.add(beam);
    }
    for (const bx of [-1.65, 1.65]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 3.3), steelMat);
      beam.position.set(bx, hy, 0);
      group.add(beam);
    }
  }

  // Pump House Valve Manifold + Red Handwheel Valves at Base + Access Ladder
  const manifold = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.4, 14), tankMat);
  manifold.rotation.z = Math.PI / 2;
  manifold.position.set(0, 1.15, -2.0);
  group.add(manifold);
  for (const vx of [-0.8, 0, 0.8]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 16), valveMat);
    wheel.position.set(vx, 1.48, -2.18);
    group.add(wheel);
  }
  for (const lx of [-0.25, 0.25]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 5.4, 8), trimMat);
    rail.position.set(lx, 2.7, -1.85);
    group.add(rail);
  }
  for (let r = 0; r < 11; r++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.5, 8), trimMat);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, 0.45 + r * 0.45, -1.85);
    group.add(rung);
  }

  const catwalk = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.14, 10, 32), steelMat);
  catwalk.rotation.x = Math.PI / 2;
  catwalk.position.y = 5.4;
  const rail = new THREE.Mesh(new THREE.TorusGeometry(2.85, 0.045, 8, 32), trimMat);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 6.2;

  const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 3.0, 36), tankMat);
  tank.position.y = 6.95;
  tank.castShadow = !isSoftwareGl;
  const band = new THREE.Mesh(new THREE.TorusGeometry(2.48, 0.07, 10, 36), trimMat);
  band.rotation.x = Math.PI / 2;
  band.position.y = 6.95;
  const lid = new THREE.Mesh(new THREE.ConeGeometry(2.58, 1.05, 36), trimMat);
  lid.position.y = 8.95;
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 5.4, 16), steelMat);
  pipe.position.y = 2.7;
  group.add(catwalk, rail, tank, band, lid, pipe);

  group.position.set(0, 0, 39.0);
  return optimizeStaticGroup(group);
}

// =========================================================================
// EXPANDED MOHOLLA & OPAR PARA DETAILS: JHEEL PAR, SHISHU PARK, OUTER SHOPS
// =========================================================================

export function createJheelParDetails(isLiteShadows = false): {
  group: THREE.Group;
  boat: THREE.Group;
  flowers: THREE.Group[];
} {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.78 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.82 });
  const padMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.65 });
  const petalMat = new THREE.MeshStandardMaterial({ color: '#f472b6', roughness: 0.42 });
  const centerMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.4 });
  const poleMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.45, metalness: 0.6 });
  const lampGlow = new THREE.MeshStandardMaterial({
    color: '#fef08a',
    emissive: '#fbbf24',
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });

  // Wooden lakeside viewing pier extending onto East shore of Jheel (-130.6..-127.0, z -84.2..-79.8)
  const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.1, 4.4), woodMat);
  pierDeck.position.set(-129.0, 0.08, -82.0);
  pierDeck.receiveShadow = true;
  group.add(pierDeck);

  for (const px of [-130.7, -127.3]) {
    for (const pz of [-84.0, -80.0]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.95, 10), darkWoodMat);
      post.position.set(px, 0.47, pz);
      group.add(post);
    }
  }

  // Twin Lakeside Lantern Posts at North and South corners of Jheel Par
  for (const lz of [-91.2, -72.8]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 3.2, 10), poleMat);
    post.position.set(-130.2, 1.6, lz);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 14), lampGlow);
    globe.position.set(-130.2, 3.3, lz);
    group.add(post, globe);
  }

  // Drifting Wooden Country Boat (Nouka) on Jheel water
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.44, 3.8), darkWoodMat);
  hull.castShadow = !isLiteShadows;
  const prowF = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.15, 4), woodMat);
  prowF.rotation.x = Math.PI / 2;
  prowF.rotation.z = Math.PI / 4;
  prowF.position.set(0, 0.08, 2.35);
  const prowB = prowF.clone();
  prowB.rotation.x = -Math.PI / 2;
  prowB.position.set(0, 0.08, -2.35);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.48), woodMat);
  bench.position.set(0, 0.28, 0.1);
  const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 8), woodMat);
  oar.rotation.z = Math.PI / 2 - 0.18;
  oar.position.set(0.3, 0.36, -0.35);
  boat.add(hull, prowF, prowB, bench, oar);
  boat.position.set(-140.5, 0.08, -83.5);
  boat.rotation.y = 0.24;
  group.add(boat);

  // Floating Shapla (Water Lilies) across Jheel Par surface
  const flowers: THREE.Group[] = [];
  const flowerSpots: Array<[number, number]> = [
    [-135.2, -88.0],
    [-143.2, -86.5],
    [-136.0, -76.2],
    [-142.8, -75.0],
    [-133.5, -80.8],
  ];
  for (const [fx, fz] of flowerSpots) {
    const fl = new THREE.Group();
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 14), padMat);
    const bloom = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.24, 6), petalMat);
    bloom.rotation.x = Math.PI;
    bloom.position.y = 0.12;
    const bud = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), centerMat);
    bud.position.y = 0.16;
    fl.add(pad, bloom, bud);
    fl.position.set(fx, 0.06, fz);
    group.add(fl);
    flowers.push(fl);
  }

  return { group: optimizeStaticGroup(group, [boat, ...flowers]), boat, flowers };
}

export function createShishuParkProps(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): { group: THREE.Group; wheelGroup: THREE.Group } {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.4, metalness: 0.72 });
  const hubMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.25, metalness: 0.78 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.32, metalness: 0.35 });
  const spokeMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3, metalness: 0.65 });
  const slideMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.32 });
  const seesawMat = new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.45 });
  const benchMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.52 });

  const gondolaColors = ['#f43f5e', '#38bdf8', '#facc15', '#22c55e', '#a855f7', '#fb923c', '#14b8a6', '#e879f9'];
  const gondolaGlows = gondolaColors.map(
    (hex) =>
      new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.08,
        roughness: 0.32,
      }),
  );

  // Concrete octagonal platform inside park_ferris_base (136..141.5, -85..-79)
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.28, 5.6), steelMat);
  plinth.position.set(138.75, 0.14, -82.0);
  plinth.receiveShadow = true;
  group.add(plinth);

  // Twin A-Frame support legs reaching hub at (138.75, 5.2, -82.0)
  for (const fz of [-83.4, -80.6]) {
    for (const dx of [-1.85, 1.85]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 5.45, 10), steelMat);
      leg.position.set(138.75 + dx * 0.5, 2.75, fz);
      leg.rotation.z = dx < 0 ? -0.35 : 0.35;
      leg.castShadow = !isSoftwareGl;
      group.add(leg);
    }
  }
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.4, 14), hubMat);
  axle.rotation.x = Math.PI / 2;
  axle.position.set(138.75, 5.2, -82.0);
  group.add(axle);

  // Rotating Ferris Wheel (Nagordola) in XY plane around Z-axis
  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(138.75, 5.2, -82.0);

  const wheelRadius = 3.35;
  for (const rz of [-0.9, 0.9]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius, 0.085, 10, 32), rimMat);
    rim.position.z = rz;
    wheelGroup.add(rim);
  }
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const gx = Math.cos(ang) * wheelRadius;
    const gy = Math.sin(ang) * wheelRadius;
    for (const rz of [-0.9, 0.9]) {
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, wheelRadius * 2, 8), spokeMat);
      spoke.rotation.z = ang + Math.PI / 2;
      spoke.position.z = rz;
      if (i < 4) wheelGroup.add(spoke);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.8, 8), hubMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(gx, gy, 0);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.72, 1.2), gondolaGlows[i]);
    cabin.position.set(gx, gy - 0.38, 0);
    wheelGroup.add(bar, cabin);
  }
  group.add(wheelGroup);

  // Park Seesaw + Slide + Benches around North/South sides (leaving task_park at 133, -82 unobstructed)
  const slideTower = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.1, 1.4), benchMat);
  slideTower.position.set(142.0, 1.05, -73.0);
  const slideChute = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 1.0), slideMat);
  slideChute.position.set(140.0, 1.05, -73.0);
  slideChute.rotation.z = 0.62;
  group.add(slideTower, slideChute);

  const seesawPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.6, 10), steelMat);
  seesawPivot.position.set(139.0, 0.3, -90.5);
  const seesawPlank = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 0.5), seesawMat);
  seesawPlank.position.set(139.0, 0.64, -90.5);
  seesawPlank.rotation.z = 0.15;
  group.add(seesawPivot, seesawPlank);

  for (const bz of [-88.5, -75.5]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 0.75), benchMat);
    bench.position.set(130.5, 0.48, bz);
    for (const dx of [-0.9, 0.9]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 0.65), steelMat);
      leg.position.set(130.5 + dx, 0.22, bz);
      group.add(leg);
    }
    group.add(bench);
  }

  // Park Signboard facing West Avenue (x = 128.2, z = -82)
  const signPostL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4.2, 10), rimMat);
  signPostL.position.set(128.2, 2.1, -84.0);
  const signPostR = signPostL.clone();
  signPostR.position.z = -80.0;
  const signFaceMat = new THREE.MeshStandardMaterial({
    map: textures.parkSignMap,
    emissive: '#ffffff',
    emissiveMap: textures.parkSignMap,
    emissiveIntensity: 0.04,
    roughness: 0.4,
  });
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.35, 4.6), signFaceMat);
  signBoard.position.set(128.2, 4.15, -82.0);
  group.add(signPostL, signPostR, signBoard);

  return { group: optimizeStaticGroup(group, [wheelGroup]), wheelGroup };
}

export function createOuterShopProps(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): THREE.Group {
  const group = new THREE.Group();
  const counterWood = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.72 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.42, metalness: 0.72 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.18, metalness: 0.9 });
  const copperMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.26, metalness: 0.78 });
  const redClothMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.65 });
  const emberMat = new THREE.MeshStandardMaterial({
    color: '#fb923c',
    emissive: '#ea580c',
    emissiveIntensity: 0.75,
    roughness: 0.65,
  });

  // 1. Nawab Kacchi Ghor: Chula Counter + 3 Copper Kacchi Deg Pots (kacchi_deg_counter -145.6..-142.2, -34.5..-21.5)
  const kacchiCounter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.15, 12.6), counterWood);
  kacchiCounter.position.set(-143.9, 0.575, -28.0);
  kacchiCounter.castShadow = !isSoftwareGl;
  group.add(kacchiCounter);

  const degPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.55, 0),
    new THREE.Vector2(0.75, 0.38),
    new THREE.Vector2(0.58, 0.78),
    new THREE.Vector2(0.66, 0.88),
    new THREE.Vector2(0.01, 0.88),
  ];
  const degGeo = new THREE.LatheGeometry(degPts, 20);
  for (const dz of [-31.8, -28.0, -24.2]) {
    const ember = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.12, 14), emberMat);
    ember.position.set(-143.8, 1.18, dz);
    const deg = new THREE.Mesh(degGeo, copperMat);
    deg.position.set(-143.8, 1.2, dz);
    const cloth = new THREE.Mesh(new THREE.CylinderGeometry(0.67, 0.63, 0.22, 16), redClothMat);
    cloth.position.set(-143.8, 1.98, dz);
    group.add(ember, deg, cloth);
  }

  // 2. GG Cyber Adda: Gaming Desk + 4 Glowing RGB Dual-Monitor Rigs (cyber_pc_row -145.6..-142.5, 21..35)
  const cyberDesk = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.0, 13.6), darkMetal);
  cyberDesk.position.set(-144.05, 0.5, 28.0);
  cyberDesk.castShadow = !isSoftwareGl;
  group.add(cyberDesk);
  const rgbScreens = [
    new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.55, roughness: 0.2 }),
    new THREE.MeshStandardMaterial({ color: '#f472b6', emissive: '#db2777', emissiveIntensity: 0.55, roughness: 0.2 }),
  ];
  for (let i = 0; i < 4; i++) {
    const pz = 22.8 + i * 3.45;
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.92, 1.65), darkMetal);
    monitor.position.set(-144.6, 1.56, pz);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.78, 1.48), rgbScreens[i % 2]);
    screen.position.set(-144.5, 1.56, pz);
    const pcTower = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.42), darkMetal);
    pcTower.position.set(-144.4, 1.45, pz + 1.15);
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.7), rgbScreens[i % 2]);
    chairSeat.position.set(-141.6, 0.52, pz);
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.88, 0.65), darkMetal);
    chairBack.position.set(-141.25, 0.96, pz);
    group.add(monitor, screen, pcTower, chairSeat, chairBack);
  }

  // 3. Shilpi Dorji Bari: Tailor Workbench, Sewing Machine & Bright Cloth Bolts (dorji_table 142.5..145.6, -34.5..-21.5)
  const dorjiBench = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.02, 12.6), counterWood);
  dorjiBench.position.set(144.05, 0.51, -28.0);
  dorjiBench.castShadow = !isSoftwareGl;
  group.add(dorjiBench);
  const sewBody = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.48, 0.9), darkMetal);
  sewBody.position.set(144.0, 1.26, -28.0);
  const sewWheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 14), chromeMat);
  sewWheel.position.set(144.0, 1.42, -27.5);
  group.add(sewBody, sewWheel);
  const clothColors = ['#e11d48', '#facc15', '#10b981', '#3b82f6', '#a855f7'];
  clothColors.forEach((hex, idx) => {
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 1.35, 12),
      new THREE.MeshStandardMaterial({ color: hex, roughness: 0.7 }),
    );
    bolt.rotation.z = Math.PI / 2;
    bolt.position.set(144.1, 1.26, -33.0 + idx * 0.75);
    group.add(bolt);
  });

  // 4. Tiger Para Gym: Squat Rack, Loaded Barbell & Punching Bag (gym_rack 142.5..145.6, 21.5..34.5)
  const gymBase = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 12.6), darkMetal);
  gymBase.position.set(144.05, 0.1, 28.0);
  group.add(gymBase);
  for (const uz of [26.2, 29.8]) {
    const upright = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.35, 0.18), darkMetal);
    upright.position.set(144.2, 1.22, uz);
    group.add(upright);
  }
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 3.8), darkMetal);
  topBar.position.set(144.2, 2.35, 28.0);
  const barbell = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 4.4, 10), chromeMat);
  barbell.rotation.x = Math.PI / 2;
  barbell.position.set(143.7, 1.55, 28.0);
  for (const pz of [26.0, 30.0]) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.14, 16), redClothMat);
    plate.rotation.x = Math.PI / 2;
    plate.position.set(143.7, 1.55, pz);
    group.add(plate);
  }
  const punchBag = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.55, 14), redClothMat);
  punchBag.position.set(143.8, 1.45, 23.2);
  group.add(topBar, barbell, punchBag);

  // 5. Balaka Cineplex: Glowing Silver Screen & Tiered Red Velvet Seats (cinema_seats -74.5..-63.5, -140.5..-138.2)
  const cineScreen = new THREE.Mesh(
    new THREE.BoxGeometry(12.2, 2.25, 0.14),
    new THREE.MeshStandardMaterial({
      color: '#e0f2fe',
      emissive: '#7dd3fc',
      emissiveIntensity: 0.25,
      roughness: 0.3,
    }),
  );
  cineScreen.position.set(-69.0, 1.65, -142.85);
  for (const cx of [-75.5, -62.5]) {
    const curtain = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.6, 0.3), redClothMat);
    curtain.position.set(cx, 1.65, -142.75);
    group.add(curtain);
  }
  const seatRowBase = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.62, 2.1), darkMetal);
  seatRowBase.position.set(-69.0, 0.31, -139.35);
  group.add(cineScreen, seatRowBase);
  for (let i = 0; i < 6; i++) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.75, 1.1), redClothMat);
    seat.position.set(-73.4 + i * 1.76, 0.85, -139.35);
    group.add(seat);
  }

  // 6. A+ Coaching: Chalkboard & Classroom Desk Row (coach_desk 22.0..34.0, -141.5..-139.5)
  const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(10.6, 1.9, 0.14), counterWood);
  boardFrame.position.set(28.0, 1.75, -142.85);
  const chalkboard = new THREE.Mesh(
    new THREE.BoxGeometry(10.1, 1.55, 0.18),
    new THREE.MeshStandardMaterial({ color: '#064e3b', roughness: 0.85 }),
  );
  chalkboard.position.set(28.0, 1.75, -142.82);
  const benchDesk = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.92, 1.85), counterWood);
  benchDesk.position.set(28.0, 0.46, -140.5);
  benchDesk.castShadow = !isSoftwareGl;
  group.add(boardFrame, chalkboard, benchDesk);

  // 7. Opar Mach Bazar: Twin Wet-Market Fish Stalls (mach_table_n & mach_table_s -75.5..-62.5, 121..123.5 & 132.5..135)
  const stallMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.58 });
  const iceMat = new THREE.MeshStandardMaterial({ color: '#e0f2fe', roughness: 0.2 });
  const canopyMat = new THREE.MeshStandardMaterial({ map: textures.bazarAwningMap, roughness: 0.52 });
  for (const tz of [122.25, 133.75]) {
    const table = new THREE.Mesh(new THREE.BoxGeometry(12.6, 1.05, 2.3), stallMat);
    table.position.set(-69.0, 0.525, tz);
    table.castShadow = !isSoftwareGl;
    const iceSlab = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.12, 1.9), iceMat);
    iceSlab.position.set(-69.0, 1.1, tz);
    group.add(table, iceSlab);
    for (let f = 0; f < 6; f++) {
      const fish = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.58, 6, 8), chromeMat);
      fish.rotation.z = Math.PI / 2;
      fish.position.set(-73.8 + f * 1.9, 1.24, tz);
      group.add(fish);
    }
  }
  const bazarRoof = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.16, 15.6), canopyMat);
  bazarRoof.position.set(-69.0, 3.25, 128.0);
  group.add(bazarRoof);
  for (const px of [-75.5, -62.5]) {
    for (const pz of [120.8, 135.2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 3.25, 10), darkMetal);
      post.position.set(px, 1.625, pz);
      group.add(post);
    }
  }

  // 8. South Signal Yard: Elevated Steel Railway Signal Tower (signal_tower_base 31.5..36.0, 124.5..131.5)
  const gantryBase = new THREE.Mesh(new THREE.BoxGeometry(4.3, 3.4, 6.8), darkMetal);
  gantryBase.position.set(33.75, 1.7, 128.0);
  gantryBase.castShadow = !isSoftwareGl;
  const towerCab = new THREE.Mesh(
    new THREE.BoxGeometry(4.7, 2.0, 5.2),
    new THREE.MeshStandardMaterial({ color: '#ca8a04', roughness: 0.45 }),
  );
  towerCab.position.set(33.75, 4.4, 128.0);
  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.24, 5.6), darkMetal);
  cabRoof.position.set(33.75, 5.5, 128.0);
  const semMast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.6, 10), chromeMat);
  semMast.position.set(31.8, 3.8, 124.9);
  const sigGreen = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 12, 12),
    new THREE.MeshStandardMaterial({ color: '#22c55e', emissive: '#16a34a', emissiveIntensity: 0.55, roughness: 0.25 }),
  );
  sigGreen.position.set(31.35, 7.2, 124.9);
  const sigRed = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 12, 12),
    new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#dc2626', emissiveIntensity: 0.55, roughness: 0.25 }),
  );
  sigRed.position.set(31.35, 6.4, 124.9);
  group.add(gantryBase, towerCab, cabRoof, semMast, sigGreen, sigRed);

  return optimizeStaticGroup(group);
}

