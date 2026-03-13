import { Accelerometer } from 'expo-sensors';
import { useEffect, useState } from 'react';

export interface TiltData {
  x: number;
  y: number;
  z: number;
}

export function useTilt(updateInterval = 16): TiltData {
  const [tilt, setTilt] = useState<TiltData>({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    // Устанавливаем частоту обновления акселерометра
    Accelerometer.setUpdateInterval(updateInterval);

    const subscription = Accelerometer.addListener(acc => {
      setTilt(acc);
    });

    return () => subscription.remove();
  }, [updateInterval]);

  return tilt;
}