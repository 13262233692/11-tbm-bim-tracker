import React, { useState } from 'react';
import {
  Eye,
  Camera,
  Layers,
  Play,
  Pause,
  Settings,
  Maximize,
  Minimize,
} from 'lucide-react';
import { useModelStore } from '@/store/modelStore';
import { cn } from '@/lib/utils';

interface ControlBarProps {
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  onToggleFullscreen,
  isFullscreen,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeCamera, setActiveCamera] = useState('follow');
  const frustumConfig = useModelStore((state) => state.frustumConfig);
  const setFrustumConfig = useModelStore((state) => state.setFrustumConfig);

  const cameraModes = [
    { id: 'follow', label: '跟随', icon: Camera },
    { id: 'front', label: '前方', icon: Eye },
    { id: 'side', label: '侧面', icon: Eye },
    { id: 'top', label: '俯视', icon: Eye },
  ];

  const handleCameraMode = (mode: string) => {
    setActiveCamera(mode);
    if ((window as any).__tbmControls) {
      (window as any).__tbmControls.setCameraMode(mode);
      (window as any).__tbmControls.setFollowTBM(mode === 'follow');
    }
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-cyan-500/20 rounded-xl px-4 py-3 flex items-center gap-4 z-50">
      <div className="flex items-center gap-1 pr-4 border-r border-slate-700">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={cn(
            'p-2 rounded-lg transition-all duration-200',
            isPlaying
              ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
              : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
          )}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex items-center gap-1 pr-4 border-r border-slate-700">
        <span className="text-xs text-slate-400 mr-2">视角:</span>
        {cameraModes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => handleCameraMode(mode.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
              activeCamera === mode.id
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 pr-4 border-r border-slate-700">
        <span className="text-xs text-slate-400 mr-2">渲染:</span>
        <button
          onClick={() =>
            setFrustumConfig({ enabled: !frustumConfig.enabled })
          }
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
            frustumConfig.enabled
              ? 'bg-green-500/20 text-green-400'
              : 'text-slate-400 hover:bg-slate-700/50'
          )}
          title="视锥体剔除"
        >
          <Layers className="w-3 h-3" />
          剔除
        </button>
        <button
          onClick={() =>
            setFrustumConfig({ dynamicLOD: !frustumConfig.dynamicLOD })
          }
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
            frustumConfig.dynamicLOD
              ? 'bg-green-500/20 text-green-400'
              : 'text-slate-400 hover:bg-slate-700/50'
          )}
          title="动态LOD"
        >
          <Layers className="w-3 h-3" />
          LOD
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-slate-300 transition-all duration-200"
          title="设置"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleFullscreen}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-slate-300 transition-all duration-200"
          title={isFullscreen ? '退出全屏' : '全屏'}
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4" />
          ) : (
            <Maximize className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
