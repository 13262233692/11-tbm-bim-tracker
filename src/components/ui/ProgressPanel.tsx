import React, { useMemo } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Layers, TrendingUp, Target } from 'lucide-react';
import { DataCurve } from '../charts/DataCurve';
import { usePoseStore, selectSmoothedPose, selectRecentHistory } from '@/store/poseStore';
import { useModelStore } from '@/store/modelStore';

export const ProgressPanel: React.FC = () => {
  const smoothedPose = usePoseStore(selectSmoothedPose);
  const history = usePoseStore(selectRecentHistory);
  const tbmConfig = useModelStore((state) => state.tbmConfig);

  const progress = useMemo(() => {
    if (!smoothedPose) return 0;
    return (smoothedPose.ringCount / tbmConfig.totalSegments) * 100;
  }, [smoothedPose, tbmConfig.totalSegments]);

  if (!smoothedPose) {
    return (
      <div className="absolute top-16 right-4 w-96 bg-slate-900/80 backdrop-blur-md border border-cyan-500/20 rounded-xl p-4 z-40">
        <div className="flex items-center justify-center h-64 text-slate-500">
          <div className="animate-pulse text-center">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>等待进度数据...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-16 right-4 w-96 bg-slate-900/80 backdrop-blur-md border border-cyan-500/20 rounded-xl p-4 z-40">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700">
        <Target className="w-5 h-5 text-cyan-400" />
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          掘进进度
        </h2>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="w-28 h-28 flex-shrink-0">
          <CircularProgressbar
            value={progress}
            text={`${progress.toFixed(1)}%`}
            styles={buildStyles({
              textSize: '16px',
              textColor: '#22d3ee',
              pathColor: '#22d3ee',
              trailColor: '#1e293b',
              backgroundColor: '#0f172a',
            })}
          />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">已完成环数</span>
            <span className="text-lg font-mono font-bold text-cyan-400">
              {smoothedPose.ringCount}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">总环数</span>
            <span className="text-sm font-mono text-slate-300">
              {tbmConfig.totalSegments}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">当前里程</span>
            <span className="text-sm font-mono text-green-400">
              {smoothedPose.mileage.toFixed(2)} m
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wider">
            衬砌管片
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-xl font-mono font-bold text-cyan-400">
              {smoothedPose.ringCount * 6}
            </div>
            <div className="text-xs text-slate-500">已安装</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-xl font-mono font-bold text-orange-400">
              6
            </div>
            <div className="text-xs text-slate-500">待安装</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-xl font-mono font-bold text-slate-400">
              {tbmConfig.totalSegments * 6 - smoothedPose.ringCount * 6}
            </div>
            <div className="text-xs text-slate-500">剩余</div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wider">
            姿态趋势
          </span>
        </div>

        <div className="h-32">
          <DataCurve
            data={history}
            dataKey="pitch"
            label="俯仰角趋势"
            unit="°"
            color="#22d3ee"
            warningThreshold={3}
            dangerThreshold={5}
          />
        </div>
      </div>
    </div>
  );
};
