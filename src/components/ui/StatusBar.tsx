import React from 'react';
import { Activity, Wifi, WifiOff, Clock, Gauge } from 'lucide-react';
import { usePoseStore, selectIsConnected } from '@/store/poseStore';
import { useModelStore, selectRenderStats } from '@/store/modelStore';

export const StatusBar: React.FC = () => {
  const isConnected = usePoseStore(selectIsConnected);
  const renderStats = useModelStore(selectRenderStats);
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute top-0 left-0 right-0 h-12 bg-slate-900/80 backdrop-blur-md border-b border-cyan-500/20 flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              TBM ATTITUDE MONITOR
            </h1>
            <p className="text-xs text-cyan-400/70">盾构机姿态监控系统</p>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-700" />

        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-green-400 animate-pulse" />
              <span className="text-sm text-green-400 font-mono">CONNECTED</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400 font-mono">DISCONNECTED</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">FPS:</span>
            <span className={`font-mono ${
              renderStats.fps >= 55 ? 'text-green-400' :
              renderStats.fps >= 30 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {renderStats.fps}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Draw Calls:</span>
            <span className="text-cyan-400 font-mono">{renderStats.drawCalls}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Triangles:</span>
            <span className="text-cyan-400 font-mono">{renderStats.triangles.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Visible:</span>
            <span className="text-cyan-400 font-mono">{renderStats.visibleSegments}</span>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-700" />

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-slate-300 font-mono">
            {currentTime.toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  );
};
