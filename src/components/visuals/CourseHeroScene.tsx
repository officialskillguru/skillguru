import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line, Sphere } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group } from "three";

type Vec3 = [number, number, number];

const nodePositions: Vec3[] = [
  [-2.4, 0.8, 0],
  [-1.3, -0.45, 0.35],
  [-0.2, 0.5, -0.2],
  [0.85, -0.25, 0.15],
  [1.9, 0.75, -0.1],
  [2.45, -0.65, 0.2],
];

function NeuralCourseMesh() {
  const groupRef = useRef<Group>(null);
  const lines = useMemo(
    (): Array<[Vec3, Vec3]> => [
      [nodePositions[0]!, nodePositions[1]!],
      [nodePositions[1]!, nodePositions[2]!],
      [nodePositions[2]!, nodePositions[3]!],
      [nodePositions[3]!, nodePositions[4]!],
      [nodePositions[3]!, nodePositions[5]!],
      [nodePositions[0]!, nodePositions[2]!],
      [nodePositions[2]!, nodePositions[4]!],
    ],
    [],
  );

  useFrame(({ clock, pointer }) => {
    if (!groupRef.current) {
      return;
    }

    groupRef.current.rotation.y = pointer.x * 0.14 + Math.sin(clock.elapsedTime * 0.22) * 0.08;
    groupRef.current.rotation.x = -pointer.y * 0.08 + Math.cos(clock.elapsedTime * 0.2) * 0.04;
  });

  return (
    <group ref={groupRef}>
      {lines.map(([start, end], index) => (
        <Line key={index} points={[start, end]} color="#19D9FF" lineWidth={1.15} transparent opacity={0.36} />
      ))}
      {nodePositions.map((position, index) => (
        <Float key={position.join("-")} speed={1.2 + index * 0.08} rotationIntensity={0.24} floatIntensity={0.28}>
          <Sphere args={[index % 2 === 0 ? 0.09 : 0.07, 24, 24]} position={position}>
            <meshStandardMaterial color={index % 2 === 0 ? "#19D9FF" : "#1147FF"} emissive={index % 2 === 0 ? "#19D9FF" : "#1147FF"} emissiveIntensity={0.85} roughness={0.42} metalness={0.18} />
          </Sphere>
        </Float>
      ))}
    </group>
  );
}

export function CourseHeroScene() {
  return (
    <div className="course-three-scene" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 5.2], fov: 42 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}>
        <ambientLight intensity={1.1} />
        <pointLight position={[2.6, 2.8, 3]} intensity={2.1} color="#19D9FF" />
        <pointLight position={[-2.2, -1.4, 2.5]} intensity={1.2} color="#1147FF" />
        <NeuralCourseMesh />
      </Canvas>
    </div>
  );
}
