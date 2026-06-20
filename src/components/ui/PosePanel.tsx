import React from 'react';
import { Navigation, RotateCcw, Move } from 'lucide-react';
import { GaugeMeter } from '../charts/GaugeMeter';
import { usePoseStore, selectSmoothedPose } from '@/store/poseStore';

export const PosePanel: React.FC = () => {
  const smoothedPose = usePoseStore(selectSmoothedPose);

  if (!smoothedPose) {
    return (
      <div className="absolute top-16 left-4 w-80 bg-slate-900/80 backdrop-blur-md border border-cyan-500/20 rounded-xl p-4 z-40">
        <div className="flex items-center justify-center h-64 text-slate-500">
          <div className="animate-pulse text-center">
            <Navigation className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>等待姿态数据...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-16 left-4 w-80 bg-slate-900/80 backdrop-blur-md border border-cyan-500/20 rounded-xl p-4 z-40">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700">
        <Navigation className="w-5 h-5 text-cyan-400" />
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          姿态参数
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <GaugeMeter
          value={smoothedPose.rotation.pitch}
          label="俯仰角"
          min={-10}
          max={10}
          warningThreshold={3}
          dangerThreshold={5}
          size="sm"
        />
        <GaugeMeter
          value={smoothedPose.rotation.yaw}
          label="偏航角"
          min={-10}
          max={10}
          warningThreshold={3}
          dangerThreshold={5}
          size="sm"
        />
        <GaugeMeter
          value={smoothedPose.rotation.roll}
          label="滚动角"
          min={-10}
          max={10}
          warningThreshold={3}
          dangerThreshold={5}
          size="sm"
        />
      </div>

      <div className="border-t border-slate-700 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Move className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wider">
            三维坐标
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">X</div>
            <div className="text-lg font-mono font-bold text-cyan-400">
              {smoothedPose.position.x.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">m</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Y</div>
            <div className="text-lg font-mono font-bold text-cyan-400">
              {smoothedPose.position.y.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">m</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Z</div>
            <div className="text-lg font-mono font-bold text-cyan-400">
              {smoothedPose.position.z.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">m</div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <RotateCcw className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wider">
            刀盘参数
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">转速</div>
            <div className="text-lg font-mono font-bold text-orange-400">
              {smoothedPose.cutterHead.speed.toFixed(1)}
            </div>
            <div className="text-xs text-slate-500">rpm</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">扭矩</div>
            <div className="text-lg font-mono font-bold text-orange-400">
              {smoothedPose.cutterHead.torque.toFixed(0)}
            </div>
            <div className="text-xs text-slate-500">kN·m</div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-4 mt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">推进力</div>
            <div className="text-lg font-mono font-bold text-green-400">
              {smoothedPose.thrust.totalForce.toFixed(0)}
            </div>
            <div className="text-xs text-slate-500">kN</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">推进速度</div>
            <div className="text-lg font-mono font-bold text-green-400">
              {smoothedPose.thrust.speed.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">mm/min</div>
          </div>
        </div>
      </div>
    </div>
  );
};
