import React, { useRef, useState, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import CombinedScene, {
  FBXLights,
  calculateMeshArea,
  calculateFloorDimensions,
} from "./components/RoomModel";
import * as THREE from "three";
import DesignModal from "./components/DesignModal";

const MESH_TYPE_MAP = {
  Cube017: "floor",
  Cube022: "wall",
  Cube001: "sofa",
  Cube012: "curtain",
  "G-__556050": "curtain",
};

// Default repeats as fallback
const MESH_REPEAT_MAP = {
  // floor: [8, 8],
  wall: [2, 2],
  sofa: [1, 1],
  curtain: [5, 5],
};

function MeshSelector({ onSelect, onFloorMeshFound }) {
  const { gl, camera, scene } = useThree();

  // Find floor mesh on scene load and calculate its area
  useEffect(() => {
    // Wait for scene to be fully loaded
    setTimeout(() => {
      scene.traverse((object) => {
        if (object.isMesh && MESH_TYPE_MAP[object.name] === "floor") {
          const floorArea = calculateMeshArea(object);
          const floorDimensions = calculateFloorDimensions(object);

          if (onFloorMeshFound) {
            onFloorMeshFound(object, floorArea, floorDimensions);
          }
        }
      });
    }, 1000); // Give time for the model to load
  }, [scene, onFloorMeshFound]);

  React.useEffect(() => {
    const handleClick = (event) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const mouse = new THREE.Vector2(x, y);

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        if (onSelect) onSelect(mesh);
      }
    };

    gl.domElement.addEventListener("click", handleClick);
    return () => {
      gl.domElement.removeEventListener("click", handleClick);
    };
  }, [gl, camera, scene, onSelect]);

  return null;
}

const textureLoader = new THREE.TextureLoader();

function App() {
  const cameraPosition = [0, 1.6, 0];
  const [modal, setModal] = useState({
    open: false,
    mesh: null,
    meshType: null,
  });
  const [floorArea, setFloorArea] = useState(null);
  const [floorDimensions, setFloorDimensions] = useState({
    width: 0,
    length: 0,
  });
  const [debugInfo, setDebugInfo] = useState(null);

  // Store a ref to the last selected mesh for applying design
  const lastSelectedMesh = useRef(null);

  // Add a conversion factor
  const UNITS_CONVERSION = 3.28084; // Convert from meters to feet

  const handleFloorMeshFound = (mesh, area, dimensions) => {
    // Store raw values from model (in meters)
    const rawArea = area;
    const rawDimensions = dimensions;

    // Convert to feet for display
    const areaInFeet = rawArea * UNITS_CONVERSION * UNITS_CONVERSION; // Square the conversion for area
    const dimensionsInFeet = {
      width: rawDimensions.width * UNITS_CONVERSION,
      length: rawDimensions.length * UNITS_CONVERSION,
    };

    setFloorArea(areaInFeet);
    setFloorDimensions(dimensionsInFeet);
  };

  const handleSelect = (mesh) => {
    const meshType = MESH_TYPE_MAP[mesh.name];
    if (meshType) {
      setModal({ open: true, mesh, meshType });
      lastSelectedMesh.current = mesh;
    } else {
      setModal({ open: false, mesh: null, meshType: null });
      lastSelectedMesh.current = null;
    }
  };

  // When a design is selected in the modal, apply it to the mesh
  const handleApplyDesign = (design) => {
    if (!lastSelectedMesh.current) return;

    textureLoader.load(design.image, (texture) => {
      // Create a new canvas to draw the texture with borders
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Once texture is loaded, we'll use it to draw borders
      texture.image.onload = () => {
        // Set canvas size to match texture
        canvas.width = texture.image.width;
        canvas.height = texture.image.height;

        // Draw the original texture
        ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);

        // Add tile border
        ctx.strokeStyle = "rgba(0, 0, 0, 1)";
        ctx.lineWidth = 10;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        // Create a new texture from the canvas
        const borderedTexture = new THREE.CanvasTexture(canvas);
        borderedTexture.wrapS = THREE.RepeatWrapping;
        borderedTexture.wrapT = THREE.RepeatWrapping;

        // Determine mesh type for material properties
        const meshType = MESH_TYPE_MAP[lastSelectedMesh.current.name];

        // Set texture repeat based on tile dimensions
        if (
          meshType === "floor" &&
          design.dimensions &&
          floorDimensions.width > 0
        ) {
          // Calculate repeats based on dimensions (already in feet)
          const repeatX = floorDimensions.width / design.dimensions.width;
          const repeatY = floorDimensions.length / design.dimensions.height;

          // Use direct calculation without aspect ratio adjustment
          borderedTexture.repeat.set(repeatX, repeatY);

          // Store original repeat values for debugging
          const actualTiles = repeatX * repeatY;
          setDebugInfo({
            repeatX: repeatX,
            repeatY: repeatY,
            floorWidth: floorDimensions.width,
            floorLength: floorDimensions.length,
            tileWidth: design.dimensions.width,
            tileHeight: design.dimensions.height,
            tilesNeeded: Math.ceil(actualTiles),
            totalArea: floorArea, // Use the already calculated floor area
            tilesArea:
              repeatX *
              repeatY *
              (design.dimensions.width * design.dimensions.height),
            unitType: "feet", // Explicitly show the unit type
          });
        } else {
          const [repeatX, repeatY] = MESH_REPEAT_MAP[meshType] || [1, 1];
          borderedTexture.repeat.set(repeatX, repeatY);
        }

        borderedTexture.colorSpace = THREE.SRGBColorSpace;

        if (meshType === "floor") {
          // Clone the current geometry to work with it
          const geometry = lastSelectedMesh.current.geometry.clone();

          // Create materials for top face vs sides/bottom
          const topMaterial = new THREE.MeshStandardMaterial({
            map: borderedTexture,
            color: "#ffffff",
            metalness: 0.7,
            roughness: 0,
          });

          const sideMaterial = new THREE.MeshStandardMaterial({
            color: "#aaaaaa", // Light gray for sides/bottom
            metalness: 0.2,
            roughness: 0.7,
          });

          // Create a new multi-material array
          const materials = [];

          // Identify which faces are pointing up (top surface)
          const normals = geometry.attributes.normal;
          const position = geometry.attributes.position;
          const index = geometry.index;

          // Groups to separate top faces from side/bottom faces
          geometry.clearGroups();

          // Track which faces are top faces (have normals pointing up)
          const topFaces = [];
          const sideFaces = [];

          // Analyze each triangle
          for (let i = 0; i < index.count; i += 3) {
            // Get the three vertices of the triangle
            const a = index.getX(i);
            const b = index.getX(i + 1);
            const c = index.getX(i + 2);

            // Get the normal for this triangle (average of vertex normals)
            const normalA = new THREE.Vector3(
              normals.getX(a),
              normals.getY(a),
              normals.getZ(a)
            );
            const normalB = new THREE.Vector3(
              normals.getX(b),
              normals.getY(b),
              normals.getZ(b)
            );
            const normalC = new THREE.Vector3(
              normals.getX(c),
              normals.getY(c),
              normals.getZ(c)
            );

            // Average normal for the face
            const faceNormal = new THREE.Vector3()
              .add(normalA)
              .add(normalB)
              .add(normalC)
              .divideScalar(3);

            // If normal is pointing up (Y+), it's a top face
            if (faceNormal.y > 0.5) {
              topFaces.push(i / 3);
            } else {
              sideFaces.push(i / 3);
            }
          }

          // Create groups for top and side faces
          if (topFaces.length > 0) {
            geometry.addGroup(topFaces[0] * 3, topFaces.length * 3, 0);
          }
          if (sideFaces.length > 0) {
            geometry.addGroup(sideFaces[0] * 3, sideFaces.length * 3, 1);
          }

          // Create a new mesh with the grouped geometry and materials
          const newMesh = new THREE.Mesh(geometry, [topMaterial, sideMaterial]);

          // Copy properties from the original mesh
          newMesh.position.copy(lastSelectedMesh.current.position);
          newMesh.rotation.copy(lastSelectedMesh.current.rotation);
          newMesh.scale.copy(lastSelectedMesh.current.scale);
          newMesh.name = lastSelectedMesh.current.name;
          newMesh.castShadow = lastSelectedMesh.current.castShadow;
          newMesh.receiveShadow = lastSelectedMesh.current.receiveShadow;

          // Replace the original mesh with the new one
          if (lastSelectedMesh.current.parent) {
            lastSelectedMesh.current.parent.add(newMesh);
            lastSelectedMesh.current.parent.remove(lastSelectedMesh.current);
            lastSelectedMesh.current = newMesh;
          }
        } else {
          // For non-floor meshes, continue with original approach
          let materialProps = {
            map: borderedTexture,
            color: "#ffffff",
          };

          if (meshType === "wall") {
            materialProps.metalness = 0.2;
            materialProps.roughness = 0;
          } else if (meshType === "sofa") {
            materialProps.metalness = 0.1;
            materialProps.roughness = 0.8;
          } else if (meshType === "curtain") {
            materialProps.metalness = 0;
            materialProps.roughness = 1;
            materialProps.transparent = true;
            materialProps.side = THREE.DoubleSide;
            materialProps.opacity = 0.95;
          }

          lastSelectedMesh.current.material = new THREE.MeshStandardMaterial(
            materialProps
          );
          lastSelectedMesh.current.material.needsUpdate = true;
        }

        // // Store the repeat values for debugging
        // const currentRepeatX = borderedTexture.repeat.x;
        // const currentRepeatY = borderedTexture.repeat.y;

        // // Add debug information to the floor area display
        // if (meshType === "floor") {
        //   setDebugInfo({
        //     repeatX: currentRepeatX,
        //     repeatY: currentRepeatY,
        //     floorWidth: floorDimensions.width,
        //     floorLength: floorDimensions.length,
        //     tileWidth: design.dimensions.width,
        //     tileHeight: design.dimensions.height,
        //   });
        // }
      };

      // Force the image to load
      if (!texture.image.complete) {
        texture.image.src = texture.image.src;
      } else {
        // If already loaded, trigger onload manually
        texture.image.onload();
      }
    });

    setModal({ open: false, mesh: null, meshType: null });
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas
        gl={{ outputColorSpace: THREE.SRGBColorSpace }}
        shadows
        camera={{ position: cameraPosition, fov: 75 }}
      >
        <ambientLight intensity={0.7} />
        {/* <Environment files="/hdr/empty_play_room_4k.hdr" background /> */}
        <Environment preset="apartment" background />
        <CombinedScene />
        <OrbitControls
          target={[0, 0, 0]} // Target the center of the scene
          enablePan={true} // Allow panning
          enableZoom={true} // Keep zoom enabled
          minDistance={1} // Minimum zoom distance
          maxDistance={20} // Maximum zoom distance
          minPolarAngle={0} // Keep these as is
          maxPolarAngle={Math.PI}
        />
        <MeshSelector
          onSelect={handleSelect}
          onFloorMeshFound={handleFloorMeshFound}
        />
      </Canvas>

      {floorArea && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            background: "rgba(0,0,0,0.7)",
            color: "white",
            padding: "8px 12px",
            borderRadius: 4,
            maxWidth: "300px",
          }}
        >
          {/* <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            Floor Area: {floorArea.toFixed(2)} sq ft
          </div> */}
          <div>
            Dimensions: {floorDimensions.width.toFixed(2)} ×{" "}
            {floorDimensions.length.toFixed(2)} ft
          </div>
          {debugInfo && (
            <div style={{ marginTop: 8, fontSize: "0.9em" }}>
              <div
                style={{
                  borderTop: "1px solid #555",
                  paddingTop: "4px",
                  marginBottom: "4px",
                }}
              >
                <strong>Tile Information:</strong>
              </div>
              <div>
                Tile Size: {debugInfo.tileWidth}×{debugInfo.tileHeight} ft
              </div>
              <div>
                Needed: {Math.ceil(debugInfo.repeatX)} ×{" "}
                {Math.ceil(debugInfo.repeatY)} tiles
              </div>
              <div>Total Tiles: {debugInfo.tilesNeeded} pieces</div>
              <div>
                Coverage: ~{debugInfo.tilesArea?.toFixed(2) ?? "N/A"} sq ft
              </div>
              <div
                style={{
                  fontSize: "0.8em",
                  marginTop: "4px",
                  opacity: 0.8,
                }}
              >
                (All measurements in {debugInfo.unitType})
              </div>
            </div>
          )}
        </div>
      )}

      <DesignModal
        open={modal.open}
        meshType={modal.meshType}
        onClose={() => setModal({ open: false, mesh: null, meshType: null })}
        onApply={handleApplyDesign}
        floorArea={floorArea}
      />
    </div>
  );
}

export default App;
