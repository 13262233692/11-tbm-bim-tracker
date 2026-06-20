import type { TbmPoseData } from '@/types/tbm';

export class ExponentialMovingAverage {
  private alpha: number;
  private lastValue: number | null = null;

  constructor(alpha: number = 0.3) {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }

  update(value: number): number {
    if (this.lastValue === null) {
      this.lastValue = value;
      return value;
    }
    this.lastValue = this.alpha * value + (1 - this.alpha) * this.lastValue;
    return this.lastValue;
  }

  reset(): void {
    this.lastValue = null;
  }
}

export class PoseSmoother {
  private posX: ExponentialMovingAverage;
  private posY: ExponentialMovingAverage;
  private posZ: ExponentialMovingAverage;
  private pitch: ExponentialMovingAverage;
  private yaw: ExponentialMovingAverage;
  private roll: ExponentialMovingAverage;
  private cutterSpeed: ExponentialMovingAverage;

  constructor(alpha: number = 0.2) {
    this.posX = new ExponentialMovingAverage(alpha);
    this.posY = new ExponentialMovingAverage(alpha);
    this.posZ = new ExponentialMovingAverage(alpha);
    this.pitch = new ExponentialMovingAverage(alpha);
    this.yaw = new ExponentialMovingAverage(alpha);
    this.roll = new ExponentialMovingAverage(alpha);
    this.cutterSpeed = new ExponentialMovingAverage(alpha * 0.5);
  }

  smooth(pose: TbmPoseData): TbmPoseData {
    return {
      ...pose,
      position: {
        x: this.posX.update(pose.position.x),
        y: this.posY.update(pose.position.y),
        z: this.posZ.update(pose.position.z),
      },
      rotation: {
        pitch: this.pitch.update(pose.rotation.pitch),
        yaw: this.yaw.update(pose.rotation.yaw),
        roll: this.roll.update(pose.rotation.roll),
      },
      cutterHead: {
        ...pose.cutterHead,
        speed: this.cutterSpeed.update(pose.cutterHead.speed),
      },
    };
  }

  reset(): void {
    this.posX.reset();
    this.posY.reset();
    this.posZ.reset();
    this.pitch.reset();
    this.yaw.reset();
    this.roll.reset();
    this.cutterSpeed.reset();
  }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function detectOutlier(value: number, history: number[], threshold: number = 3): boolean {
  if (history.length < 5) return false;
  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  const std = Math.sqrt(
    history.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / history.length
  );
  return Math.abs(value - mean) > threshold * std;
}
