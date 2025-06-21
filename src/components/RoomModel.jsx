import React, { useEffect, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export function GLBModel({ glbPath, onFloorAreaCalculated }) {
    const { scene } = useGLTF(glbPath)
    const [floorArea, setFloorArea] = useState(null)

    useEffect(() => {
        // Find floor mesh by name (adjust based on your model structure)
        const floorMesh = scene.getObjectByName('floor') ||
            scene.children.find(child =>
                child.name.toLowerCase().includes('floor'));

        if (floorMesh && floorMesh.geometry) {
            // Calculate floor area
            const area = calculateMeshArea(floorMesh);

            // Calculate floor dimensions
            const dimensions = calculateFloorDimensions(floorMesh);

            setFloorArea(area);
            if (onFloorAreaCalculated) {
                onFloorAreaCalculated(area, dimensions);
            }
        }
    }, [scene, onFloorAreaCalculated]);

    scene.traverse((child) => {
        child.castShadow = true
        child.receiveShadow = true
    })

    return <primitive object={scene} />
}

// Calculate area of a mesh by summing triangle areas
export function calculateMeshArea(mesh) {
    const geometry = mesh.geometry;
    let area = 0;

    if (geometry.isBufferGeometry) {
        const position = geometry.attributes.position;
        const index = geometry.index;

        if (index) {
            // Indexed geometry
            for (let i = 0; i < index.count; i += 3) {
                const a = new THREE.Vector3().fromBufferAttribute(position, index.getX(i));
                const b = new THREE.Vector3().fromBufferAttribute(position, index.getX(i + 1));
                const c = new THREE.Vector3().fromBufferAttribute(position, index.getX(i + 2));

                // For floor, we might only care about the x,z components (assuming y is up)
                // This calculates the area of the triangle projected onto the xz plane
                // Project vertices to XZ plane (ignoring height/Y)
                const ab = new THREE.Vector2(b.x - a.x, b.z - a.z);
                const ac = new THREE.Vector2(c.x - a.x, c.z - a.z);
                area += Math.abs(ab.cross(ac)) / 2;
            }
        } else {
            // Non-indexed geometry
            for (let i = 0; i < position.count; i += 3) {
                const a = new THREE.Vector3().fromBufferAttribute(position, i);
                const b = new THREE.Vector3().fromBufferAttribute(position, i + 1);
                const c = new THREE.Vector3().fromBufferAttribute(position, i + 2);

                // Project vertices to XZ plane (ignoring height/Y)
                const ab = new THREE.Vector2(b.x - a.x, b.z - a.z);
                const ac = new THREE.Vector2(c.x - a.x, c.z - a.z);
                area += Math.abs(ab.cross(ac)) / 2;
            }
        }
    }

    return area;
}

// New function to calculate floor dimensions
export function calculateFloorDimensions(mesh) {
    const geometry = mesh.geometry;

    if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
    }

    const boundingBox = geometry.boundingBox;

    // Assuming y is up, the floor dimensions are in x and z
    const width = boundingBox.max.x - boundingBox.min.x;
    const length = boundingBox.max.z - boundingBox.min.z;

    return { width, length };
}

export default function CombinedScene() {
    const [floorArea, setFloorArea] = useState(null);

    return (
        <>
            <GLBModel
                glbPath="/3Dmodels/room.glb"
                onFloorAreaCalculated={area => setFloorArea(area)}
            />
            {/* {floorArea && (
                <div style={{
                    position: 'absolute',
                    bottom: 20,
                    left: 20,
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: 4
                }}>
                    {/* Floor Area: {floorArea.toFixed(2)} square units */}
            {/* </div > */}
            )
            {/* // } */}
        </>
    )
}
