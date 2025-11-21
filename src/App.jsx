import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Move, Ruler, RefreshCw, Image as ImageIcon, FileText, Info, maximize } from 'lucide-react';

export default function App() {
  const [image, setImage] = useState(null);
  const [productTitle, setProductTitle] = useState("Antraciete tafelhoes voor buiten");
  const [dimensionsText, setDimensionsText] = useState("220 x 90 x 80\n210 x 100 x 80\n180 x 90 x 75 / 60");
  const [parsedDimensions, setParsedDimensions] = useState([]);
  
  // Fixed Output Size
  const OUTPUT_SIZE = 500;
  
  // Positions of the labels (in percentages relative to the 500x500 canvas)
  const [positions, setPositions] = useState({
    width: { x: 50, y: 85 },
    depth: { x: 85, y: 65 },
    height: { x: 15, y: 50 },
    frontHeight: { x: 35, y: 65 }
  });

  const [dragTarget, setDragTarget] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Placeholder for initial state
  const placeholderImage = null;

  // Parse text input
  useEffect(() => {
    const lines = dimensionsText.split('\n').filter(line => line.trim() !== '');
    const parsed = lines.map((line, index) => {
      const parts = line.match(/(\d+)\s*[LDH]?/gi)?.map(m => m.replace(/[LDH\s]/gi, ''));
      
      if (!parts || parts.length < 3) return null;

      return {
        id: index,
        width: parts[0] || '',
        depth: parts[1] || '',
        height: parts[2] || '',
        frontHeight: parts[3] || '',
        unit: 'cm',
        originalString: line.trim()
      };
    }).filter(d => d !== null);

    setParsedDimensions(parsed);
    setPreviewIndex(0);
  }, [dimensionsText]);


  // Handle Image Upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setImage({
            src: event.target.result,
            width: img.width,
            height: img.height
          });
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Dragging Logic
  const handleMouseDown = (key) => {
    setDragTarget(key);
  };

  const handleMouseMove = (e) => {
    if (!dragTarget || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPositions({
      ...positions,
      [dragTarget]: { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
    });
  };

  const handleMouseUp = () => {
    setDragTarget(null);
  };

  // Effect to draw preview
  useEffect(() => {
    drawCanvas(previewIndex);
  }, [image, positions, parsedDimensions, previewIndex, productTitle]);

  const drawCanvas = (index) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const currentSize = parsedDimensions[index];

    // 1. Setup Fixed 500x500 Canvas
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    // 2. Fill Background White
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    // 3. Draw & Scale Image (Contain / Fit)
    if (image) {
        const imgObj = new Image();
        imgObj.src = image.src;
        
        // Calculate scale to fit 500x500 preserving aspect ratio
        const scale = Math.min(OUTPUT_SIZE / image.width, OUTPUT_SIZE / image.height);
        const x = (OUTPUT_SIZE / 2) - (image.width / 2) * scale;
        const y = (OUTPUT_SIZE / 2) - (image.height / 2) * scale;

        ctx.drawImage(imgObj, x, y, image.width * scale, image.height * scale);
    } else {
        // Draw placeholder text if no image
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0,0, OUTPUT_SIZE, OUTPUT_SIZE);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Upload een afbeelding", OUTPUT_SIZE/2, OUTPUT_SIZE/2);
    }

    // Global Font Settings for 500x500
    const fontSize = 22; // Fixed legible size for 500px
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // 4. Draw Title Top Center
    if (productTitle && currentSize) {
        // Construct full title string
        let sizeString = `${currentSize.width}x${currentSize.depth}x${currentSize.height}`;
        if (currentSize.frontHeight) {
            sizeString += `/${currentSize.frontHeight}`;
        }
        sizeString += currentSize.unit;
        const fullTitle = `${productTitle} - ${sizeString}`;

        // Check if title fits, scale down slightly if too long
        let titleFontSize = 24;
        ctx.font = `bold ${titleFontSize}px sans-serif`;
        let titleMetrics = ctx.measureText(fullTitle);
        while (titleMetrics.width > OUTPUT_SIZE - 40 && titleFontSize > 12) {
             titleFontSize -= 2;
             ctx.font = `bold ${titleFontSize}px sans-serif`;
             titleMetrics = ctx.measureText(fullTitle);
        }

        const titleBgPadding = 12;
        const titleBgWidth = titleMetrics.width + titleBgPadding * 2;
        const titleBgHeight = titleFontSize * 1.8;
        const titleY = 30; // Fixed position from top

        // Background
        ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'; 
        ctx.beginPath();
        ctx.roundRect((OUTPUT_SIZE / 2) - (titleBgWidth / 2), titleY - (titleBgHeight / 2), titleBgWidth, titleBgHeight, 8);
        ctx.fill();
        
        // Reset shadow
        ctx.shadowColor = "transparent"; 

        // Text
        ctx.fillStyle = '#0f172a';
        ctx.fillText(fullTitle, OUTPUT_SIZE / 2, titleY + 2);
    }
      
    if (!currentSize) return;

    // 5. Draw Labels
    const labels = [
        { key: 'width', text: `↔ ${currentSize.width} ${currentSize.unit}`, color: '#2563eb' }, // Blue
        { key: 'depth', text: `↙ ${currentSize.depth} ${currentSize.unit}`, color: '#16a34a' }, // Green
        { key: 'height', text: `↕ ${currentSize.height} ${currentSize.unit}`, color: '#dc2626' }, // Red
        { key: 'frontHeight', text: `↕VH ${currentSize.frontHeight} ${currentSize.unit}`, color: '#f97316' } // Orange
    ];

    // Label Font
    ctx.font = `bold ${fontSize}px sans-serif`;

    labels.forEach(label => {
        // Skip if the value is empty
        if (!currentSize[label.key]) return;

        const pos = positions[label.key];
        const x = (pos.x / 100) * OUTPUT_SIZE;
        const y = (pos.y / 100) * OUTPUT_SIZE;
        
        const text = label.text;
        const metrics = ctx.measureText(text);
        const paddingX = 12;
        const paddingY = 8;
        const boxWidth = metrics.width + paddingX * 2;
        const boxHeight = fontSize + paddingY * 2;

        // Drop Shadow for pill
        ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;

        // Draw Pill Background
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.roundRect(x - boxWidth/2, y - boxHeight/2, boxWidth, boxHeight, boxHeight/2);
        ctx.fill();

        // Remove shadow for text/border
        ctx.shadowColor = "transparent";

        // Border
        ctx.strokeStyle = label.color;
        ctx.lineWidth = 3; // Thicker border for clarity
        ctx.stroke();

        // Text
        ctx.fillStyle = '#1e293b';
        ctx.fillText(text, x, y + 2);
    });
  };

  // Batch Generator
  const downloadAll = async () => {
    if (parsedDimensions.length === 0) {
        alert("Geen maten gevonden.");
        return;
    }
    setIsGenerating(true);
    const canvas = canvasRef.current;
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < parsedDimensions.length; i++) {
      setPreviewIndex(i);
      await wait(100); // Faster generation
      
      const size = parsedDimensions[i];
      let fileName = `hoes-${size.width}x${size.depth}x${size.height}`;
      if(size.frontHeight) fileName += `-${size.frontHeight}`;
      fileName += `.webp`; // Changed to WebP

      try {
          const link = document.createElement('a');
          link.download = fileName;
          // Export as WebP with 92% quality (high sharpness, low file size)
          link.href = canvas.toDataURL('image/webp', 0.92);
          link.click();
      } catch (e) {
          console.error(e);
      }
    }
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-8 h-8 text-blue-600" />
              Hoes Generator (WebP)
            </h1>
            <p className="text-slate-500">Exporteert scherpe .webp bestanden van exact 500x500 pixels.</p>
          </div>
          <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition shadow-sm font-medium">
            <Upload size={18} />
            <span>Foto Uploaden</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Editor */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
              <div className="w-full flex justify-between items-center mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Move size={18} /> Editor (500x500 Preview)
                </h2>
                <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                   1:1 Aspect Ratio
                </div>
              </div>

              {/* Canvas Container - Forced Square using aspect-ratio */}
              <div 
                ref={containerRef}
                className="relative w-full max-w-[500px] bg-white shadow-lg rounded-sm overflow-hidden border border-slate-200 select-none cursor-crosshair"
                style={{ aspectRatio: '1/1' }}
              >
                {/* The Actual Canvas */}
                <canvas 
                  ref={canvasRef} 
                  className="w-full h-full block"
                />

                {/* Interactive Drag Handles (Overlay) */}
                {image && (
                  <>
                    {/* Width Handle */}
                    <div 
                      onMouseDown={(e) => { e.preventDefault(); handleMouseDown('width'); }}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold shadow-md border border-white z-10 hover:scale-105 transition-transform ${dragTarget === 'width' ? 'scale-110 ring-2 ring-blue-300' : ''}`}
                      style={{ left: `${positions.width.x}%`, top: `${positions.width.y}%` }}
                    >
                      ↔ Breedte
                    </div>

                    {/* Depth Handle */}
                    <div 
                      onMouseDown={(e) => { e.preventDefault(); handleMouseDown('depth'); }}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move px-3 py-1.5 rounded-full bg-green-600 text-white text-xs font-bold shadow-md border border-white z-10 hover:scale-105 transition-transform ${dragTarget === 'depth' ? 'scale-110 ring-2 ring-green-300' : ''}`}
                      style={{ left: `${positions.depth.x}%`, top: `${positions.depth.y}%` }}
                    >
                      ↙ Diepte
                    </div>

                    {/* Height Handle */}
                    <div 
                      onMouseDown={(e) => { e.preventDefault(); handleMouseDown('height'); }}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold shadow-md border border-white z-10 hover:scale-105 transition-transform ${dragTarget === 'height' ? 'scale-110 ring-2 ring-red-300' : ''}`}
                      style={{ left: `${positions.height.x}%`, top: `${positions.height.y}%` }}
                    >
                      ↕ Hoogte
                    </div>

                     {/* Front Height Handle */}
                     <div 
                      onMouseDown={(e) => { e.preventDefault(); handleMouseDown('frontHeight'); }}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move px-3 py-1.5 rounded-full bg-orange-500 text-white text-xs font-bold shadow-md border border-white z-10 hover:scale-105 transition-transform ${dragTarget === 'frontHeight' ? 'scale-110 ring-2 ring-orange-300' : ''}`}
                      style={{ left: `${positions.frontHeight.x}%`, top: `${positions.frontHeight.y}%` }}
                    >
                      ↕ VH
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Data Entry */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Basis Producttitel</label>
                <input 
                  type="text" 
                  value={productTitle}
                  onChange={(e) => setProductTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">Maten Lijst</label>
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    {parsedDimensions.length} rijen
                  </span>
                </div>
                <textarea 
                  value={dimensionsText}
                  onChange={(e) => setDimensionsText(e.target.value)}
                  className="flex-1 w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm resize-none"
                  style={{ minHeight: '200px' }}
                />
                 <p className="text-xs text-slate-400 mt-2">
                   Plak je lijst hier. Formaat: <code>L x D x H</code> of <code>L x D x H / VH</code>
                 </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 space-y-4">
                 {parsedDimensions.length > 0 && (
                  <div className="flex flex-wrap gap-2 max-h-[80px] overflow-y-auto">
                      {parsedDimensions.map((dim, idx) => (
                        <button
                          key={dim.id}
                          onClick={() => setPreviewIndex(idx)}
                          className={`text-xs px-2 py-1 rounded border ${previewIndex === idx ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}`}
                        >
                          {dim.width}x{dim.depth}
                        </button>
                      ))}
                  </div>
                )}

                <button
                  onClick={downloadAll}
                  disabled={!image || isGenerating || parsedDimensions.length === 0}
                  className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-white shadow-md transition-all ${!image ? 'bg-slate-300' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {isGenerating ? <RefreshCw className="animate-spin" size={20} /> : <Download size={20} />}
                  Download Alles (WebP)
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
