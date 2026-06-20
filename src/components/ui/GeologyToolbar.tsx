import React, { useState } from 'react';
import {
  useGeologyStore,
  selectHasHardRockAlert,
  selectAverageHardness,
} from '@/store/geologyStore';
import { SOIL_LAYER_PRESETS } from '@/types/geology';

export const GeologyToolbar: React.FC = () => {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'layers' | 'stress' | 'data'>('layers');

  const profileData = useGeologyStore((s) => s.profileData);
  const isProfileVisible = useGeologyStore((s) => s.isProfileVisible);
  const toggleProfileVisible = useGeologyStore((s) => s.toggleProfileVisible);
  const showStressHighlight = useGeologyStore((s) => s.showStressHighlight);
  const toggleStressHighlight = useGeologyStore((s) => s.toggleStressHighlight);
  const hardnessAlertThreshold = useGeologyStore((s) => s.hardnessAlertThreshold);
  const setHardnessAlertThreshold = useGeologyStore((s) => s.setHardnessAlertThreshold);
  const generateMockProfile = useGeologyStore((s) => s.generateMockProfile);
  const isLoading = useGeologyStore((s) => s.isLoading);
  const loadingProgress = useGeologyStore((s) => s.loadingProgress);
  const activeStressZones = useGeologyStore((s) => s.activeStressZones);
  const lastUpdateTime = useGeologyStore((s) => s.lastUpdateTime);

  const hasAlert = useGeologyStore(selectHasHardRockAlert);
  const avgHardness = useGeologyStore(selectAverageHardness);

  const handleRefresh = () => {
    if (!profileData) {
      generateMockProfile(0, 0, 0, { x: 0, y: 0, z: 0, w: 1 });
    } else {
      const cp = profileData.centerPoint;
      const n = profileData.normal;
      const quat = new (require('three') as typeof import('three')).Quaternion().setFromUnitVectors(
        new (require('three') as typeof import('three')).Vector3(1, 0, 0),
        new (require('three') as typeof import('three')).Vector3(n.x, n.y, n.z)
      );
      generateMockProfile(cp.x, cp.y, cp.z, {
        x: quat.x,
        y: quat.y,
        z: quat.z,
        w: quat.w,
      });
    }
  };

  const formatTime = (ts: number) => {
    if (!ts) return '--';
    return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false });
  };

  return (
    <div
      className={`absolute right-0 top-20 h-[calc(100%-160px)] w-80 z-20
        transition-all duration-500 ease-out transform
        ${expanded ? 'translate-x-0' : 'translate-x-72'}`}
    >
      <div className="relative h-full w-full bg-slate-900/92 backdrop-blur-md border-l-2 border-cyan-500/40
        rounded-l-2xl shadow-2xl shadow-cyan-500/10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1
          bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 animate-pulse" />

        <button
          onClick={() => setExpanded(!expanded)}
          className="absolute left-0 top-6 -translate-x-full
            w-8 h-16 bg-slate-900/95 backdrop-blur-md rounded-l-xl
            border-l-2 border-t-2 border-b-2 border-cyan-500/50
            flex items-center justify-center hover:bg-cyan-500/20
            transition-all duration-200 group z-30"
        >
          <svg
            className={`w-4 h-4 text-cyan-400 transition-transform duration-300
              ${expanded ? 'rotate-180' : ''} group-hover:scale-125`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-cyan-500/20 flex items-center justify-between">
            <div>
              <h2 className="text-cyan-400 text-sm font-bold tracking-wider
                flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                地质剖析
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                更新时间: {formatTime(lastUpdateTime)}
              </p>
            </div>
            {hasAlert && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg
                bg-red-500/20 border border-red-500/50 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-red-400 text-xs font-bold">硬岩预警</span>
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-b border-cyan-500/20 grid grid-cols-2 gap-2">
            <button
              onClick={toggleProfileVisible}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all
                border ${isProfileVisible
                  ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-inner shadow-cyan-500/20'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-300'
                }`}
            >
              {isProfileVisible ? '✓ 剖面可见' : '○ 剖面隐藏'}
            </button>
            <button
              onClick={toggleStressHighlight}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all
                border ${showStressHighlight
                  ? 'bg-red-500/20 border-red-500/60 text-red-300 shadow-inner shadow-red-500/20'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-300'
                }`}
            >
              {showStressHighlight ? '⚠ 应力高亮' : '○ 应力关闭'}
            </button>
          </div>

          <div className="px-4 py-3 border-b border-cyan-500/20">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400">硬度预警阈值</span>
              <span className="text-orange-400 font-bold">
                {(hardnessAlertThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={hardnessAlertThreshold}
              onChange={(e) => setHardnessAlertThreshold(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full bg-slate-700 appearance-none
                cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>软土</span>
              <span>中硬</span>
              <span>硬岩</span>
            </div>
          </div>

          <div className="px-4 py-2 border-b border-cyan-500/20">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="py-2 rounded-lg bg-slate-800/50">
                <div className="text-lg font-bold text-cyan-400">
                  {avgHardness > 0 ? (avgHardness * 100).toFixed(0) + '%' : '--'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">平均硬度</div>
              </div>
              <div className="py-2 rounded-lg bg-slate-800/50">
                <div className="text-lg font-bold text-orange-400">
                  {activeStressZones.length}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">应力集中区</div>
              </div>
              <div className="py-2 rounded-lg bg-slate-800/50">
                <div className="text-lg font-bold text-blue-400">
                  {profileData?.boreholePoints.length ?? 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">钻孔数据点</div>
              </div>
            </div>
          </div>

          <div className="flex border-b border-cyan-500/20 bg-slate-900/60">
            {(['layers', 'stress', 'data'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-medium transition-all
                  ${activeTab === tab
                    ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/10'
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                {tab === 'layers' && '土层分布'}
                {tab === 'stress' && '应力区'}
                {tab === 'data' && '数据'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {activeTab === 'layers' && (
              <div className="space-y-1.5">
                {SOIL_LAYER_PRESETS.map((layer, idx) => {
                  const count = profileData?.boreholePoints.filter(
                    (p) => p.layerId === layer.id
                  ).length ?? 0;
                  const pct = profileData
                    ? (count / profileData.boreholePoints.length) * 100
                    : 0;
                  return (
                    <div
                      key={layer.id}
                      className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50
                        hover:border-cyan-500/30 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border border-slate-600 shadow-inner
                            flex-shrink-0"
                          style={{ backgroundColor: layer.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-200 font-medium truncate">
                              {idx + 1}. {layer.name}
                            </span>
                            <span className="text-[10px] text-slate-500 ml-1 flex-shrink-0">
                              {(layer.hardness * 100).toFixed(0)}
                            </span>
                          </div>
                          <div className="mt-1 h-1 rounded-full bg-slate-900 overflow-hidden">
                            <div
                              className="h-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: layer.color,
                              }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                            {layer.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'stress' && (
              <div className="space-y-2">
                {activeStressZones.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-500/10
                      flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    无异常应力集中区<br />
                    <span className="text-slate-600">地层均匀稳定</span>
                  </div>
                ) : (
                  activeStressZones.slice(0, 8).map((zone, i) => (
                    <div
                      key={zone.id}
                      className="p-2 rounded-lg bg-red-500/10 border border-red-500/30
                        animate-pulse-slow"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-red-400">
                          应力集中区 #{i + 1}
                        </span>
                        <span className="text-[10px] text-red-300 px-1.5 py-0.5 rounded
                          bg-red-500/20">
                          Δ={(zone.hardnessDelta * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500
                            transition-all duration-500"
                          style={{ width: `${Math.min(100, zone.intensity * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>强度: {(zone.intensity * 100).toFixed(0)}%</span>
                        <span>半径: {zone.radius.toFixed(1)}m</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="text-xs text-slate-400 mb-2">钻孔点云数据集</div>
                  <div className="text-[11px] space-y-1 text-slate-300">
                    <div className="flex justify-between">
                      <span>数据点数量</span>
                      <span className="text-cyan-400 font-mono">
                        {profileData?.boreholePoints.length ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>三角面片数</span>
                      <span className="text-cyan-400 font-mono">
                        {profileData?.triangulation?.triangles.length ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>土层种类</span>
                      <span className="text-cyan-400 font-mono">
                        {new Set(profileData?.boreholePoints.map((p) => p.layerId)).size ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>剖面尺寸</span>
                      <span className="text-cyan-400 font-mono">
                        {profileData?.width.toFixed(1)}×{profileData?.height.toFixed(1)}m
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-lg text-sm font-medium
                    bg-gradient-to-r from-cyan-600 to-blue-600
                    hover:from-cyan-500 hover:to-blue-500
                    text-white shadow-lg shadow-cyan-500/30
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"
                          className="opacity-25" />
                        <path fill="currentColor" className="opacity-75"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      解析中 {loadingProgress}%
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      重新生成地质剖面
                    </>
                  )}
                </button>

                {isLoading && (
                  <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-blue-500
                        transition-all duration-300"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                )}

                <div className="p-2 rounded-lg bg-slate-800/30 border border-slate-700/30">
                  <div className="text-[10px] text-slate-500 leading-relaxed">
                    💡 提示：地质剖面紧贴盾构刀盘前方，
                    根据当前掘进断面动态生成。
                    红色区域为应力集中带，指示软硬突变地层。
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeologyToolbar;
