import { useEffect, useRef } from 'react';
import type { BioEvent } from '@bio-sdk/protocol';

interface Props {
  events: BioEvent[];
  width?: number;
  height?: number;
}

function speedColor(speed: number): string {
  // slow = blue, fast = red
  const t = Math.min(speed / 3, 1);
  const r = Math.round(t * 248 + (1 - t) * 96);
  const g = Math.round((1 - t) * 165);
  const b = Math.round((1 - t) * 250 + t * 71);
  return `rgb(${r},${g},${b})`;
}

export function MouseCanvas({ events, width = 600, height = 300 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const moves = events.filter(e => e.type === 'mousemove' && e.x !== undefined && e.y !== undefined);
    if (moves.length < 2) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#475569';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Move your mouse to see the trajectory', width / 2, height / 2);
      return;
    }

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Trail with speed-based color
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < moves.length; i++) {
      const prev = moves[i - 1]!;
      const curr = moves[i]!;
      const dx = (curr.x ?? 0) - (prev.x ?? 0);
      const dy = (curr.y ?? 0) - (prev.y ?? 0);
      const dt = curr.dt ?? 50;
      const speed = Math.hypot(dx, dy) / dt;

      ctx.beginPath();
      ctx.strokeStyle = speedColor(speed);
      ctx.globalAlpha = 0.7 + 0.3 * Math.min(i / moves.length, 1);
      ctx.moveTo(prev.x ?? 0, prev.y ?? 0);
      ctx.lineTo(curr.x ?? 0, curr.y ?? 0);
      ctx.stroke();
    }

    // Click dots
    const clicks = events.filter(e => e.type === 'click' && e.x !== undefined && e.y !== undefined);
    ctx.globalAlpha = 1;
    for (const c of clicks) {
      ctx.beginPath();
      ctx.arc(c.x ?? 0, c.y ?? 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#4ade80';
      ctx.fill();
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [events, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full rounded-lg border border-gray-800"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
