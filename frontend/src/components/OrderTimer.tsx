'use client';

import { useEffect, useState } from 'react';

interface OrderTimerProps {
  createdAt: string;
  slaMinutes?: number;
}

export default function OrderTimer({ createdAt, slaMinutes = 3 }: OrderTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const created = new Date(createdAt).getTime();

    const update = () => {
      const now = Date.now();
      setElapsed(Math.floor((now - created) / 1000));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const slaSeconds = slaMinutes * 60;
  const remaining = slaSeconds - elapsed;
  const isOverdue = remaining <= 0;
  const isWarning = remaining > 0 && remaining <= 60;

  const displaySeconds = Math.abs(remaining);
  const minutes = Math.floor(displaySeconds / 60);
  const seconds = displaySeconds % 60;

  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
        isOverdue
          ? 'bg-red-500/20 text-red-400 animate-pulse-soft'
          : isWarning
            ? 'bg-orange-500/20 text-orange-400'
            : 'bg-green-500/20 text-green-400'
      }`}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          isOverdue ? 'bg-red-400' : isWarning ? 'bg-orange-400' : 'bg-green-400'
        }`}
      />
      {isOverdue ? `−${formatted}` : formatted}
    </div>
  );
}
