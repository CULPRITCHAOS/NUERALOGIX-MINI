// src/features/semanticMesh/MeshScene.tsx

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { SemanticMesh, ColorMetric } from './types';
import { getColorForPoint } from './colorMaps';

interface MeshSceneProps {
  mesh: SemanticMesh | null;
  colorMetric: ColorMetric;
  pointSize: number;
  showEdges: boolean;
}

export const MeshScene: React.FC<MeshSceneProps> = ({
  mesh,
  colorMetric,
  pointSize,
  showEdges,
}) => {
  const points = mesh?.points ?? [];

  const positions = useMemo(() => {
    const arr = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      arr[i * 3 + 0] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    });
    return arr;
  }, [points]);

  const colors = useMemo(() => {
    const arr = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      const [r, g, b] = getColorForPoint(p, mesh?.stats, colorMetric);
      arr[i * 3 + 0] = r;
      arr[i * 3 + 1] = g;
      arr[i * 3 + 2] = b;
    });
    return arr;
  }, [points, mesh, colorMetric]);

  // Edges (optional)
  const lineSegments = useMemo(() => {
    if (!mesh?.edges) return null;
    const arr = new Float32Array(mesh.edges.length * 6);
    mesh.edges.forEach(([a, b], i) => {
      const pa = points[a];
      const pb = points[b];
      if (!pa || !pb) return; // Safety check
      arr[i * 6 + 0] = pa.x;
      arr[i * 6 + 1] = pa.y;
      arr[i * 6 + 2] = pa.z;
      arr[i * 6 + 3] = pb.x;
      arr[i * 6 + 4] = pb.y;
      arr[i * 6 + 5] = pb.z;
    });
    return arr;
  }, [mesh, points]);

  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 2]} intensity={0.8} />
      <OrbitControls enableDamping />

      {/* Points */}
      {points.length > 0 && (
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={points.length}
              array={positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={points.length}
              array={colors}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            vertexColors
            size={pointSize}
            sizeAttenuation
          />
        </points>
      )}

      {/* Edges */}
      {showEdges && lineSegments && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={lineSegments.length / 3}
              array={lineSegments}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#444444" />
        </lineSegments>
      )}
    </Canvas>
  );
};
