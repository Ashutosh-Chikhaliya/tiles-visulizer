import React from "react";

const DESIGN_OPTIONS = {
    floor: [
        { name: "Marble", image: "/designs/QUINCY BROWN_F1.jpg", dimensions: { width: 2, height: 2 } }, // 2x2 feet
        { name: "Wood", image: "/designs/tiles11.jpg", dimensions: { width: 2, height: 4 } },
        { name: "Tiles", image: "/designs/tile1.jpg", dimensions: { width: 1, height: 1 } }, // 1x1 feet
    ],
    wall: [
        { name: "Marble", image: "/designs/QUINCY BROWN_F1.jpg" },
        { name: "Tiles", image: "/designs/tile1.jpg" },
        { name: "Grey Paint", image: "/designs/wall-grey.jpg" },
    ],
    sofa: [
        { name: "Red Fabric", image: "/designs/sofa.png" },
        { name: "Green Fabric", image: "/designs/sofa-green.jpg" },
        { name: "Blue Fabric", image: "/designs/sofa-blue.jpg" },
    ],
    curtain: [
        { name: "Red Fabric", image: "/designs/sofa.png" },
        { name: "Purple Curtain", image: "/designs/curtain-purple.jpg" },
        { name: "Grey Curtain", image: "/designs/curtain-grey.jpg" },
    ],
};

export default function DesignModal({ open, meshType, onClose, onApply, floorArea }) {
    if (!open || !meshType) return null;
    const options = DESIGN_OPTIONS[meshType] || [];

    return (
        <div
            style={{
                position: "fixed",
                top: "20%",
                left: "50%",
                transform: "translate(-50%, 0)",
                background: "#fff",
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: 24,
                zIndex: 1000,
                minWidth: 300,
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
        >
            <h3>Select {meshType} design</h3>
            <div style={{ display: "flex", gap: 16, margin: "16px 0" }}>
                {options.map((opt) => {
                    // Calculate number of tiles needed if floor area is available
                    let tilesInfo = '';
                    if (meshType === 'floor' && floorArea && opt.dimensions) {
                        const tileArea = opt.dimensions.width * opt.dimensions.height;
                        const tilesNeeded = Math.ceil(floorArea / tileArea);
                        const widthCount = Math.ceil(Math.sqrt(floorArea / (opt.dimensions.height / opt.dimensions.width)));
                        const heightCount = Math.ceil(tilesNeeded / widthCount);
                        tilesInfo = `(~${tilesNeeded} tiles: ${widthCount}×${heightCount})`;
                    }

                    return (
                        <button
                            key={opt.name}
                            style={{
                                border: "2px solid #333",
                                borderRadius: 6,
                                width: 60,
                                height: 60,
                                cursor: "pointer",
                                padding: 0,
                                background: "#eee",
                                position: "relative",
                            }}
                            title={`${opt.name} ${tilesInfo}`}
                            onClick={() => onApply(opt)}
                        >
                            <img
                                src={opt.image}
                                alt={opt.name}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    borderRadius: 6,
                                }}
                            />
                            {meshType === 'floor' && opt.dimensions && (
                                <span style={{
                                    position: 'absolute',
                                    bottom: -20,
                                    left: 0,
                                    right: 0,
                                    fontSize: '9px',
                                    textAlign: 'center'
                                }}>
                                    {opt.dimensions.width}×{opt.dimensions.height}ft
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            <button onClick={onClose} style={{ marginTop: 8 }}>
                Close
            </button>
        </div>
    );
}