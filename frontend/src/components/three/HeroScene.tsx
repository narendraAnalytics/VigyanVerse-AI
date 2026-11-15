'use client';

// The Home page's 3D plate: an open textbook with science floating out of it (the logo, in 3D).
// Built from primitives only (no downloaded models or HDR files), so it loads fast.
import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';

const PAPER = '#f6edd8';
const EMERALD = '#1f5f5b';
const ORANGE = '#e0802f';
const GREEN = '#4c9a52';
const GOLD = '#c9a24a';

function bentPage(side: -1 | 1) {
  const g = new THREE.PlaneGeometry(1.5, 2, 24, 1);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + 0.75; // 0..1.5 from the spine
    // pages rise from the spine, then flatten towards the edge
    pos.setZ(i, 0.28 * Math.sin(Math.min(1, x / 1.1) * Math.PI * 0.5) - 0.06 * x * x);
    pos.setX(i, side * x);
  }
  g.computeVertexNormals();
  return g;
}

function OpenBook() {
  const left = useMemo(() => bentPage(-1), []);
  const right = useMemo(() => bentPage(1), []);
  const lines = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (const side of [-1, 1]) {
      for (let r = 0; r < 9; r++) {
        const y = -0.75 + r * 0.17;
        for (let k = 0; k < 2; k++) {
          const x = 0.25 + k * 0.95;
          pts.push(new THREE.Vector3(side * x, y, 0.28 * Math.sin(Math.min(1, x / 1.1) * Math.PI * 0.5) - 0.06 * x * x + 0.004));
        }
      }
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  return (
    <group rotation={[-1.05, 0, 0]} position={[0, -0.85, 0]}>
      <mesh position={[0, 0, -0.07]}>
        <boxGeometry args={[3.2, 2.2, 0.08]} />
        <meshStandardMaterial color={EMERALD} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[3.05, 2.06, 0.05]} />
        <meshStandardMaterial color="#e6d6b0" roughness={0.9} />
      </mesh>
      <mesh geometry={left}>
        <meshStandardMaterial color={PAPER} side={THREE.DoubleSide} roughness={0.95} />
      </mesh>
      <mesh geometry={right}>
        <meshStandardMaterial color={PAPER} side={THREE.DoubleSide} roughness={0.95} />
      </mesh>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color="#a9b8c2" />
      </lineSegments>
    </group>
  );
}

function Planet() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.3; });
  return (
    <group ref={ref} position={[0.15, 1.55, -0.4]} scale={0.42}>
      <mesh>
        <sphereGeometry args={[0.55, 40, 40]} />
        <meshStandardMaterial color={ORANGE} roughness={0.55} />
      </mesh>
      <mesh rotation={[1.25, 0.2, 0]}>
        <torusGeometry args={[0.85, 0.06, 12, 64]} />
        <meshStandardMaterial color="#f0a24d" roughness={0.4} />
      </mesh>
    </group>
  );
}

function Atom() {
  const electrons = useRef<THREE.Group>(null);
  const orbits = [0, Math.PI / 3, -Math.PI / 3];
  useFrame(({ clock }) => {
    const g = electrons.current;
    if (!g) return;
    g.children.forEach((child, i) => {
      const t = clock.elapsedTime * (1.1 + i * 0.25) + i * 2;
      const tilt = orbits[i];
      const x = Math.cos(t) * 1.05;
      const y = Math.sin(t) * 0.45;
      child.position.set(x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt), Math.sin(t) * 0.3);
    });
  });
  return (
    <group position={[0, 0.55, 0.1]} scale={0.62}>
      <mesh>
        <sphereGeometry args={[0.2, 24, 24]} />
        <meshStandardMaterial color={GREEN} emissive={GREEN} emissiveIntensity={0.25} />
      </mesh>
      {orbits.map((r, i) => (
        <mesh key={i} rotation={[0, 0, r]} scale={[1.05, 0.45, 1]}>
          <torusGeometry args={[1, 0.022, 8, 96]} />
          <meshStandardMaterial color={i === 1 ? ORANGE : GREEN} roughness={0.35} />
        </mesh>
      ))}
      <group ref={electrons}>
        {orbits.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Dna() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.6; });
  const steps = 14;
  return (
    <group ref={ref} position={[1.75, 0.55, -0.2]} rotation={[0, 0, 0.25]} scale={0.55}>
      {Array.from({ length: steps }, (_, i) => {
        const y = (i - steps / 2) * 0.17;
        const a = i * 0.55;
        const x = Math.cos(a) * 0.38;
        const z = Math.sin(a) * 0.38;
        return (
          <group key={i}>
            <mesh position={[x, y, z]}>
              <sphereGeometry args={[0.07, 12, 12]} />
              <meshStandardMaterial color={GREEN} />
            </mesh>
            <mesh position={[-x, y, -z]}>
              <sphereGeometry args={[0.07, 12, 12]} />
              <meshStandardMaterial color={ORANGE} />
            </mesh>
            <mesh position={[0, y, 0]} rotation={[0, -a, Math.PI / 2]}>
              <cylinderGeometry args={[0.018, 0.018, 0.76, 6]} />
              <meshStandardMaterial color={GOLD} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Molecule() {
  return (
    <group position={[-1.75, 0.75, -0.1]} scale={0.5}>
      <mesh>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshStandardMaterial color={ORANGE} roughness={0.4} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.52, -0.38, 0]}>
            <sphereGeometry args={[0.2, 20, 20]} />
            <meshStandardMaterial color={GREEN} roughness={0.4} />
          </mesh>
          <mesh position={[s * 0.27, -0.2, 0]} rotation={[0, 0, s * 0.95]}>
            <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
            <meshStandardMaterial color="#efe3c6" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Flask() {
  const glass = useMemo(() => {
    const pts = [
      [0.0, 0], [0.42, 0], [0.46, 0.05], [0.16, 0.62], [0.13, 0.66], [0.13, 0.95], [0.16, 1.0],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 40);
  }, []);
  const liquid = useMemo(() => {
    const pts = [[0, 0.02], [0.4, 0.02], [0.43, 0.06], [0.3, 0.3], [0, 0.3]].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 40);
  }, []);
  return (
    <group position={[-0.95, -0.15, 0.55]} scale={0.6} rotation={[0.1, 0, -0.12]}>
      <mesh geometry={liquid}>
        <meshStandardMaterial color={GREEN} emissive={GREEN} emissiveIntensity={0.25} roughness={0.2} />
      </mesh>
      <mesh geometry={glass}>
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.35} roughness={0.05} metalness={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** The camera drifts a little towards the pointer. */
function Rig() {
  const { camera, pointer } = useThree();
  useFrame(() => {
    camera.position.x += (pointer.x * 0.5 - camera.position.x) * 0.04;
    camera.position.y += (1.1 + pointer.y * 0.25 - camera.position.y) * 0.04;
    camera.lookAt(0, 0.35, 0);
  });
  return null;
}

export default function HeroScene({ active }: { active: boolean }) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.1, 4.5], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      aria-hidden
    >
      <hemisphereLight args={['#fff4dc', '#3a5a50', 0.9]} />
      <directionalLight position={[-3, 5, 4]} intensity={1.6} color="#fff1d0" />
      <directionalLight position={[4, 1, -2]} intensity={0.5} color="#9fd2c5" />
      <OpenBook />
      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.6}><Atom /></Float>
      <Float speed={1.1} rotationIntensity={0.2} floatIntensity={0.8}><Planet /></Float>
      <Float speed={1.6} rotationIntensity={0.3} floatIntensity={0.5}><Dna /></Float>
      <Float speed={1.3} rotationIntensity={0.6} floatIntensity={0.7}><Molecule /></Float>
      <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.4}><Flask /></Float>
      <ContactShadows position={[0, -1.25, 0]} opacity={0.35} scale={7} blur={2.6} far={3} color="#3b2f1a" />
      <Rig />
    </Canvas>
  );
}
