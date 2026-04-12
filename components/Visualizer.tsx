import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyzer: AnalyserNode | null;
  isPlaying: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyzer, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!analyzer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyzer.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];

        // Gradient
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#3b82f6'); // Blue
        gradient.addColorStop(1, '#a855f7'); // Purple

        ctx.fillStyle = gradient;
        // Scale height to fit
        const h = (barHeight / 255) * canvas.height;
        ctx.fillRect(x, canvas.height - h, barWidth, h);

        x += barWidth + 1;
      }
    };

    if (isPlaying) {
      draw();
    } else {
      // Draw a flat line or hold last frame
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#374151';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyzer, isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={120} 
      className="w-full h-full rounded-lg opacity-80"
    />
  );
};

export default Visualizer;
