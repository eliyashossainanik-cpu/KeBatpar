import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function isDescendantOfSkipped(
  obj: THREE.Object3D,
  root: THREE.Object3D,
  skipSet?: Set<THREE.Object3D>,
): boolean {
  if (!skipSet || skipSet.size === 0) return false;
  let cur: THREE.Object3D | null = obj;
  while (cur && cur !== root) {
    if (skipSet.has(cur)) return true;
    cur = cur.parent;
  }
  return false;
}

/**
 * Merges static child meshes inside a composite group that share the exact same
 * Material + shadow flags, collapsing dozens of draw calls into 1 mesh per material
 * while preserving exact world-relative transforms and visual detail.
 */
export function optimizeStaticGroup<T extends THREE.Group>(
  group: T,
  skipObjects?: THREE.Object3D[],
): T {
  const skipSet = skipObjects && skipObjects.length > 0 ? new Set(skipObjects) : undefined;
  group.updateMatrixWorld(true);
  const invRoot = new THREE.Matrix4().copy(group.matrixWorld).invert();

  const buckets = new Map<
    string,
    {
      material: THREE.Material;
      castShadow: boolean;
      receiveShadow: boolean;
      renderOrder: number;
      meshes: THREE.Mesh[];
    }
  >();

  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (!child.visible) return;
    if (Array.isArray(child.material)) return;
    if (isDescendantOfSkipped(child, group, skipSet)) return;
    const mat = child.material;
    const key = `${mat.uuid}|${child.castShadow ? 1 : 0}|${child.receiveShadow ? 1 : 0}|${child.renderOrder}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        material: mat,
        castShadow: child.castShadow,
        receiveShadow: child.receiveShadow,
        renderOrder: child.renderOrder,
        meshes: [],
      };
      buckets.set(key, bucket);
    }
    bucket.meshes.push(child);
  });

  const relMatrix = new THREE.Matrix4();

  for (const bucket of buckets.values()) {
    if (bucket.meshes.length < 2) continue;

    // Check common attribute set across all geometries in bucket
    const hasNormal = bucket.meshes.every((m) => Boolean(m.geometry.getAttribute('normal')));
    const hasUv = bucket.meshes.every((m) => Boolean(m.geometry.getAttribute('uv')));

    const prepared: THREE.BufferGeometry[] = [];
    for (const m of bucket.meshes) {
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      relMatrix.multiplyMatrices(invRoot, m.matrixWorld);
      g.applyMatrix4(relMatrix);

      for (const attrName of Object.keys(g.attributes)) {
        if (attrName === 'position') continue;
        if (attrName === 'normal' && hasNormal) continue;
        if (attrName === 'uv' && hasUv) continue;
        g.deleteAttribute(attrName);
      }
      g.morphAttributes = {};
      prepared.push(g);
    }

    const merged = mergeGeometries(prepared, false);
    if (!merged) {
      for (const g of prepared) g.dispose();
      continue;
    }

    for (const g of prepared) g.dispose();
    for (const m of bucket.meshes) {
      m.removeFromParent();
      m.geometry.dispose();
    }

    const mergedMesh = new THREE.Mesh(merged, bucket.material);
    mergedMesh.castShadow = bucket.castShadow;
    mergedMesh.receiveShadow = bucket.receiveShadow;
    mergedMesh.renderOrder = bucket.renderOrder;
    group.add(mergedMesh);
  }

  return group;
}

/**
 * Spatially chunks and merges static child meshes into grid cells (default 80m)
 * sharing Material + shadow flags. Unlike single-mesh merging across 320m,
 * Three.js frustum culling can then discard ~75% of off-screen static geometry
 * and ~85% of off-frustum shadow geometry.
 */
export function optimizeStaticGroupSpatial<T extends THREE.Group>(
  group: T,
  cellSize = 80,
  skipObjects?: THREE.Object3D[],
): T {
  const skipSet = skipObjects && skipObjects.length > 0 ? new Set(skipObjects) : undefined;
  group.updateMatrixWorld(true);
  const invRoot = new THREE.Matrix4().copy(group.matrixWorld).invert();

  const buckets = new Map<
    string,
    {
      material: THREE.Material;
      castShadow: boolean;
      receiveShadow: boolean;
      renderOrder: number;
      meshes: THREE.Mesh[];
    }
  >();

  const tmpCenter = new THREE.Vector3();
  const relMatrix = new THREE.Matrix4();

  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (!child.visible) return;
    if (Array.isArray(child.material)) return;
    if (isDescendantOfSkipped(child, group, skipSet)) return;

    if (!child.geometry.boundingBox) {
      child.geometry.computeBoundingBox();
    }
    if (child.geometry.boundingBox) {
      child.geometry.boundingBox.getCenter(tmpCenter);
      tmpCenter.applyMatrix4(child.matrixWorld);
    } else {
      child.getWorldPosition(tmpCenter);
    }

    const cx = Math.floor(tmpCenter.x / cellSize);
    const cz = Math.floor(tmpCenter.z / cellSize);
    const mat = child.material;
    const key = `${cx},${cz}|${mat.uuid}|${child.castShadow ? 1 : 0}|${child.receiveShadow ? 1 : 0}|${child.renderOrder}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        material: mat,
        castShadow: child.castShadow,
        receiveShadow: child.receiveShadow,
        renderOrder: child.renderOrder,
        meshes: [],
      };
      buckets.set(key, bucket);
    }
    bucket.meshes.push(child);
  });

  for (const bucket of buckets.values()) {
    if (bucket.meshes.length < 2) continue;

    const hasNormal = bucket.meshes.every((m) => Boolean(m.geometry.getAttribute('normal')));
    const hasUv = bucket.meshes.every((m) => Boolean(m.geometry.getAttribute('uv')));

    const prepared: THREE.BufferGeometry[] = [];
    for (const m of bucket.meshes) {
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      relMatrix.multiplyMatrices(invRoot, m.matrixWorld);
      g.applyMatrix4(relMatrix);

      for (const attrName of Object.keys(g.attributes)) {
        if (attrName === 'position') continue;
        if (attrName === 'normal' && hasNormal) continue;
        if (attrName === 'uv' && hasUv) continue;
        g.deleteAttribute(attrName);
      }
      g.morphAttributes = {};
      prepared.push(g);
    }

    const merged = mergeGeometries(prepared, false);
    if (!merged) {
      for (const g of prepared) g.dispose();
      continue;
    }

    for (const g of prepared) g.dispose();
    for (const m of bucket.meshes) {
      m.removeFromParent();
      m.geometry.dispose();
    }

    const mergedMesh = new THREE.Mesh(merged, bucket.material);
    mergedMesh.castShadow = bucket.castShadow;
    mergedMesh.receiveShadow = bucket.receiveShadow;
    mergedMesh.renderOrder = bucket.renderOrder;
    mergedMesh.geometry.computeBoundingSphere();
    group.add(mergedMesh);
  }

  return group;
}

export interface InstanceTransform {
  x: number;
  y?: number;
  z: number;
  rotY?: number;
  scale?: number;
}

/**
 * Turns a reusable composite template group (already optimized via optimizeStaticGroup)
 * into a minimal set of THREE.InstancedMesh objects across N world placements.
 */
export function instantiateGroupAtTransforms(
  templateGroup: THREE.Group,
  transforms: InstanceTransform[],
  target: THREE.Object3D,
): THREE.InstancedMesh[] {
  if (transforms.length === 0) return [];
  optimizeStaticGroup(templateGroup);
  templateGroup.updateMatrixWorld(true);

  const created: THREE.InstancedMesh[] = [];
  const dummy = new THREE.Object3D();
  const childMatrix = new THREE.Matrix4();
  const finalMatrix = new THREE.Matrix4();

  const meshes: THREE.Mesh[] = [];
  templateGroup.traverse((child) => {
    if (child instanceof THREE.Mesh && !Array.isArray(child.material)) {
      meshes.push(child);
    }
  });

  for (const mesh of meshes) {
    const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, transforms.length);
    inst.castShadow = mesh.castShadow;
    inst.receiveShadow = mesh.receiveShadow;

    for (let i = 0; i < transforms.length; i++) {
      const tr = transforms[i];
      dummy.position.set(tr.x, tr.y ?? 0, tr.z);
      dummy.rotation.set(0, tr.rotY ?? 0, 0);
      dummy.scale.setScalar(tr.scale ?? 1);
      dummy.updateMatrix();
      childMatrix.copy(mesh.matrixWorld);
      finalMatrix.multiplyMatrices(dummy.matrix, childMatrix);
      inst.setMatrixAt(i, finalMatrix);
    }

    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    target.add(inst);
    created.push(inst);
  }

  return created;
}
