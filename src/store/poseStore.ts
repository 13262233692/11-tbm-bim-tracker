import { create } from 'zustand';
import type { TbmPoseData, TbmPoseState, AlarmRecord } from '@/types/tbm';
import { PoseSmoother } from '@/utils/interpolation';

const poseSmoother = new PoseSmoother(0.15);

interface PoseStore extends TbmPoseState {
  alarms: AlarmRecord[];
  updatePose: (pose: TbmPoseData) => void;
  setConnected: (connected: boolean) => void;
  addAlarm: (alarm: AlarmRecord) => void;
  clearAlarms: () => void;
  reset: () => void;
  getPoseAtTime: (timestamp: number) => TbmPoseData | null;
}

export const usePoseStore = create<PoseStore>((set, get) => ({
  currentPose: null,
  poseHistory: [],
  smoothedPose: null,
  isConnected: false,
  lastUpdateTime: 0,
  alarms: [],

  updatePose: (pose: TbmPoseData) => {
    const smoothed = poseSmoother.smooth(pose);

    set((state) => ({
      currentPose: pose,
      smoothedPose: smoothed,
      lastUpdateTime: performance.now(),
      poseHistory: [...state.poseHistory.slice(-500), pose],
    }));
  },

  setConnected: (connected: boolean) => {
    set({ isConnected: connected });
  },

  addAlarm: (alarm: AlarmRecord) => {
    set((state) => ({
      alarms: [...state.alarms.slice(-100), alarm],
    }));
  },

  clearAlarms: () => {
    set({ alarms: [] });
  },

  reset: () => {
    poseSmoother.reset();
    set({
      currentPose: null,
      smoothedPose: null,
      poseHistory: [],
      alarms: [],
      isConnected: false,
      lastUpdateTime: 0,
    });
  },

  getPoseAtTime: (timestamp: number) => {
    const { poseHistory } = get();
    if (poseHistory.length === 0) return null;

    if (poseHistory.length === 1) return poseHistory[0];

    for (let i = 1; i < poseHistory.length; i++) {
      if (poseHistory[i].timestamp >= timestamp) {
        const prev = poseHistory[i - 1];
        const next = poseHistory[i];
        const t =
          (timestamp - prev.timestamp) / (next.timestamp - prev.timestamp);
        return interpolatePose(prev, next, t);
      }
    }

    return poseHistory[poseHistory.length - 1];
  },
}));

function interpolatePose(
  a: TbmPoseData,
  b: TbmPoseData,
  t: number
): TbmPoseData {
  const clampT = Math.max(0, Math.min(1, t));
  return {
    timestamp: a.timestamp + (b.timestamp - a.timestamp) * clampT,
    position: {
      x: a.position.x + (b.position.x - a.position.x) * clampT,
      y: a.position.y + (b.position.y - a.position.y) * clampT,
      z: a.position.z + (b.position.z - a.position.z) * clampT,
    },
    rotation: {
      pitch: a.rotation.pitch + (b.rotation.pitch - a.rotation.pitch) * clampT,
      yaw: a.rotation.yaw + (b.rotation.yaw - a.rotation.yaw) * clampT,
      roll: a.rotation.roll + (b.rotation.roll - a.rotation.roll) * clampT,
    },
    cutterHead: {
      speed: a.cutterHead.speed + (b.cutterHead.speed - a.cutterHead.speed) * clampT,
      torque: a.cutterHead.torque + (b.cutterHead.torque - a.cutterHead.torque) * clampT,
      rotation: a.cutterHead.rotation + (b.cutterHead.rotation - a.cutterHead.rotation) * clampT,
    },
    thrust: {
      totalForce: a.thrust.totalForce + (b.thrust.totalForce - a.thrust.totalForce) * clampT,
      speed: a.thrust.speed + (b.thrust.speed - a.thrust.speed) * clampT,
    },
    ringCount: Math.round(a.ringCount + (b.ringCount - a.ringCount) * clampT),
    mileage: a.mileage + (b.mileage - a.mileage) * clampT,
  };
}

export function selectCurrentPose(state: PoseStore) {
  return state.currentPose;
}

export function selectSmoothedPose(state: PoseStore) {
  return state.smoothedPose;
}

export function selectIsConnected(state: PoseStore) {
  return state.isConnected;
}

export function selectRecentHistory(state: PoseStore) {
  return state.poseHistory.slice(-60);
}

export function selectActiveAlarms(state: PoseStore) {
  return state.alarms.filter(
    (a) => Date.now() - a.timestamp < 30000 || a.level === 'critical'
  );
}
