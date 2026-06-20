import type { TbmPoseData } from '@/types/tbm';

export class PoseSimulator {
  private startTime: number = 0;
  private ringCount: number = 0;
  private lastRingTime: number = 0;
  private totalSegments: number = 2000;
  private segmentWidth: number = 1.5;
  private basePosition = { x: 0, y: 0, z: 0 };

  constructor(totalSegments: number = 2000, segmentWidth: number = 1.5) {
    this.totalSegments = totalSegments;
    this.segmentWidth = segmentWidth;
    this.startTime = Date.now();
    this.lastRingTime = Date.now();
  }

  generatePose(): TbmPoseData {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const ringTime = 120;

    if (Date.now() - this.lastRingTime > ringTime * 1000 && this.ringCount < this.totalSegments) {
      this.ringCount++;
      this.lastRingTime = Date.now();
    }

    const progress = this.ringCount / this.totalSegments;
    const ringAngle = (this.ringCount * Math.PI * 2) / 100;
    const curveRadius = 500;

    const x = this.ringCount * this.segmentWidth;
    const y = Math.sin(ringAngle) * curveRadius - curveRadius;
    const z = Math.cos(ringAngle) * curveRadius - curveRadius;

    const noiseX = Math.sin(elapsed * 0.5) * 0.02;
    const noiseY = Math.cos(elapsed * 0.3) * 0.015;
    const noiseZ = Math.sin(elapsed * 0.7) * 0.01;

    const pitch = Math.sin(elapsed * 0.2) * 0.5 + noiseY * 10;
    const yaw = Math.cos(elapsed * 0.15) * 0.8 + noiseX * 10;
    const roll = Math.sin(elapsed * 0.25) * 0.3 + noiseZ * 10;

    const cutterBaseSpeed = 3;
    const cutterSpeed = cutterBaseSpeed + Math.sin(elapsed * 0.1) * 0.5;
    const cutterRotation = (elapsed * cutterSpeed * 360) / 60;
    const cutterTorque = 3500 + Math.sin(elapsed * 0.3) * 500;

    const thrustForce = 15000 + Math.sin(elapsed * 0.2) * 2000;
    const thrustSpeed = 40 + Math.sin(elapsed * 0.25) * 10;

    const mileage = this.ringCount * this.segmentWidth;

    return {
      timestamp: Date.now(),
      position: {
        x: x + noiseX,
        y: y + noiseY,
        z: z + noiseZ,
      },
      rotation: {
        pitch: this.clamp(pitch, -5, 5),
        yaw: this.clamp(yaw, -5, 5),
        roll: this.clamp(roll, -5, 5),
      },
      cutterHead: {
        speed: cutterSpeed,
        torque: cutterTorque,
        rotation: cutterRotation,
      },
      thrust: {
        totalForce: thrustForce,
        speed: thrustSpeed,
      },
      ringCount: this.ringCount,
      mileage: mileage,
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  reset(): void {
    this.startTime = Date.now();
    this.ringCount = 0;
    this.lastRingTime = Date.now();
  }

  setStartPosition(x: number, y: number, z: number): void {
    this.basePosition = { x, y, z };
  }
}

export function generateInitialPose(): TbmPoseData {
  return {
    timestamp: Date.now(),
    position: { x: 0, y: 0, z: 0 },
    rotation: { pitch: 0, yaw: 0, roll: 0 },
    cutterHead: { speed: 0, torque: 0, rotation: 0 },
    thrust: { totalForce: 0, speed: 0 },
    ringCount: 0,
    mileage: 0,
  };
}

export function createPoseWebSocketMock(
  onMessage: (pose: TbmPoseData) => void,
  interval: number = 100
): {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
} {
  const simulator = new PoseSimulator();
  let timerId: number | null = null;
  let running = false;

  const start = () => {
    if (running) return;
    running = true;

    const initialPose = generateInitialPose();
    onMessage(initialPose);

    timerId = window.setInterval(() => {
      const pose = simulator.generatePose();
      onMessage(pose);
    }, interval);
  };

  const stop = () => {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    running = false;
  };

  const isRunning = () => running;

  return { start, stop, isRunning };
}
