'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn, ZoomOut } from 'lucide-react';

interface TouchFriendlyChartProps {
  children: ReactNode;
  title?: string;
  description?: string;
  data?: any[];
  dataKeyLabel?: string;
  valueFormatter?: (value: number) => string;
  showDetailOnTap?: boolean;
  height?: number;
  className?: string;
}

interface DataPoint {
  [key: string]: any;
}

export default function TouchFriendlyChart({
  children,
  title,
  description,
  data = [],
  dataKeyLabel = 'value',
  valueFormatter = (v) => v.toString(),
  showDetailOnTap = true,
  height = 250,
  className = '',
}: TouchFriendlyChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const startTouchRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Handle tap on data points
  const handleContainerTap = (e: React.TouchEvent | React.MouseEvent) => {
    if (!showDetailOnTap || !data.length) return;

    // Get position relative to container
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const relativeX = (clientX - rect.left) / rect.width;

    // Map position to data index
    const index = Math.min(Math.max(0, Math.floor(relativeX * data.length)), data.length - 1);
    setSelectedIndex(index);
  };

  // Navigate with arrows
  const navigateData = (direction: 'prev' | 'next') => {
    if (!data.length) return;

    setSelectedIndex((prev) => {
      if (prev === null) return direction === 'prev' ? data.length - 1 : 0;
      if (direction === 'prev') return prev > 0 ? prev - 1 : data.length - 1;
      return prev < data.length - 1 ? prev + 1 : 0;
    });
  };

  // Handle touch gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    startTouchRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!startTouchRef.current) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - startTouchRef.current.x;
    const diffY = endY - startTouchRef.current.y;
    const timeDiff = Date.now() - startTouchRef.current.time;

    // Detect swipe (horizontal, quick, and minimal vertical movement)
    if (Math.abs(diffX) > 50 && Math.abs(diffY) < 30 && timeDiff < 300) {
      if (diffX > 0) {
        navigateData('prev');
      } else {
        navigateData('next');
      }
    } else if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10 && timeDiff < 200) {
      // This is a tap
      handleContainerTap(e);
    }

    startTouchRef.current = null;
  };

  // Clear selection on outside tap
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelectedIndex(null);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Handle fullscreen escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        setScale(1);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  // Get selected data point
  const selectedData = selectedIndex !== null && data[selectedIndex] ? data[selectedIndex] : null;

  return (
    <>
      {/* Main Chart Container */}
      <div className={`relative ${className}`}>
        {/* Header */}
        {(title || description) && (
          <div className="flex items-center justify-between mb-4">
            <div>
              {title && <h3 className="font-semibold text-white">{title}</h3>}
              {description && <p className="text-xs text-white/50">{description}</p>}
            </div>
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Ver en pantalla completa"
            >
              <Maximize2 className="w-4 h-4 text-white/40" />
            </button>
          </div>
        )}

        {/* Chart Area */}
        <div
          ref={containerRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={handleContainerTap}
          className="relative touch-pan-y"
          style={{ height }}
        >
          {children}

          {/* Navigation Arrows (mobile) */}
          {showDetailOnTap && data.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateData('prev');
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 p-2 bg-black/30 backdrop-blur rounded-r-lg text-white/60 hover:text-white hover:bg-black/50 transition-colors sm:hidden"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateData('next');
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-black/30 backdrop-blur rounded-l-lg text-white/60 hover:text-white hover:bg-black/50 transition-colors sm:hidden"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Selected Data Detail */}
        {selectedData && showDetailOnTap && (
          <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between">
              <div>
                {Object.entries(selectedData).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="text-white/60 capitalize">{key}: </span>
                    <span className="text-white font-medium">
                      {typeof value === 'number' ? valueFormatter(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setSelectedIndex(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg"
              >
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-1 mt-2">
              {data.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === selectedIndex ? 'bg-purple-500 w-4' : 'bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Hint */}
        {showDetailOnTap && !selectedData && data.length > 0 && (
          <div className="mt-2 text-center">
            <p className="text-xs text-white/30 sm:hidden">
              Toca el gráfico o desliza para ver detalles
            </p>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col p-4 animate-in fade-in duration-200">
          {/* Fullscreen Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
              {description && <p className="text-sm text-white/50">{description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
                className="p-2 bg-white/10 rounded-lg text-white"
                disabled={scale <= 0.5}
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-white/60 text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale((s) => Math.min(2, s + 0.25))}
                className="p-2 bg-white/10 rounded-lg text-white"
                disabled={scale >= 2}
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setIsFullscreen(false);
                  setScale(1);
                }}
                className="p-2 bg-white/10 rounded-lg text-white ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Fullscreen Chart */}
          <div
            className="flex-1 overflow-auto"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
            <div style={{ height: '100%', minHeight: 400 }}>{children}</div>
          </div>

          {/* Fullscreen Data Detail */}
          {selectedData && (
            <div className="mt-4 p-4 bg-white/5 rounded-xl">
              <div className="flex flex-wrap gap-4">
                {Object.entries(selectedData).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-white/60 text-sm capitalize">{key}: </span>
                    <span className="text-white font-medium">
                      {typeof value === 'number' ? valueFormatter(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
