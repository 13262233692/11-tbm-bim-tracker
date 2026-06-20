import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Scene } from '@/components/three/Scene';
import { MatrixEngine } from '@/components/three/MatrixEngine';
import type { LODManager } from '@/components/three/LODManager';
import { StatusBar } from '@/components/ui/StatusBar';
import { PosePanel } from '@/components/ui/PosePanel';
import { ProgressPanel } from '@/components/ui/ProgressPanel';
import { ControlBar } from '@/components/ui/ControlBar';
import { GeologyToolbar } from '@/components/ui/GeologyToolbar';
import { usePoseStore } from '@/store/poseStore';
import { useModelStore } from '@/store/modelStore';
import { generateMockTunnelRings } from '@/utils/ifcUtils';
import { createPoseWebSocketMock } from '@/mock/poseSimulator';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useGeologyStore } from '@/store/geologyStore';
import type { TbmPoseData, AlarmRecord } from '@/types/tbm';
import type { WebSocketStatus } from '@/types/websocket';

export const MonitorPage: React.FC = () => {
  const matrixEngineRef = useRef<MatrixEngine>(new MatrixEngine(100));
  const lodManagerRef = useRef<LODManager | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useMockData, setUseMockData] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePose = usePoseStore((state) => state.updatePose);
  const setConnected = usePoseStore((state) => state.setConnected);
  const addAlarm = usePoseStore((state) => state.addAlarm);
  const setTunnelRings = useModelStore((state) => state.setTunnelRings);
  const setIsLoading = useModelStore((state) => state.setIsLoading);
  const setLoadingProgress = useModelStore((state) => state.setLoadingProgress);
  const generateMockProfile = useGeologyStore((s) => s.generateMockProfile);

  useEffect(() => {
    setIsLoading(true);
    setLoadingProgress(0);

    const loadInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(loadInterval);
          const rings = generateMockTunnelRings(500);
          setTunnelRings(rings);
          setIsLoading(false);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(loadInterval);
  }, [setTunnelRings, setIsLoading, setLoadingProgress]);

  useEffect(() => {
    const initTimer = setTimeout(() => {
      generateMockProfile(0, 0, 0, { x: 0, y: 0, z: 0, w: 1 });
    }, 1500);
    return () => clearTimeout(initTimer);
  }, [generateMockProfile]);

  const handlePoseMessage = useCallback((pose: TbmPoseData) => {
    updatePose(pose);

    if (Math.abs(pose.rotation.pitch) > 4 || Math.abs(pose.rotation.yaw) > 4) {
      const alarm: AlarmRecord = {
        id: `alarm-${Date.now()}`,
        timestamp: Date.now(),
        type: Math.abs(pose.rotation.pitch) > 4 ? 'pitch' : 'yaw',
        level: Math.abs(pose.rotation.pitch) > 4.5 || Math.abs(pose.rotation.yaw) > 4.5 ? 'critical' : 'alarm',
        description: `姿态${Math.abs(pose.rotation.pitch) > 4 ? '俯仰角' : '偏航角'}超限`,
        value: Math.max(Math.abs(pose.rotation.pitch), Math.abs(pose.rotation.yaw)),
        threshold: 4,
      };
      addAlarm(alarm);
    }
  }, [updatePose, addAlarm]);

  const handleStatusChange = useCallback((status: WebSocketStatus) => {
    setConnected(status === 'connected');
  }, [setConnected]);

  useWebSocket({
    url: 'ws://localhost:8080/ws',
    autoConnect: !useMockData,
    onPoseMessage: handlePoseMessage,
    onStatusChange: handleStatusChange,
  });

  useEffect(() => {
    if (useMockData) {
      const mock = createPoseWebSocketMock(handlePoseMessage, 100);
      mock.start();
      setConnected(true);

      return () => {
        mock.stop();
        setConnected(false);
      };
    }
  }, [useMockData, handlePoseMessage, setConnected]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-slate-950 overflow-hidden"
    >
      <div className="absolute inset-0">
        <Scene
          matrixEngine={matrixEngineRef.current}
          lodManager={lodManagerRef}
        />
      </div>

      <StatusBar />
      <PosePanel />
      <ProgressPanel />
      <GeologyToolbar />
      <ControlBar
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />

      <div className="absolute bottom-20 right-4 flex gap-2 z-40">
        <button
          onClick={() => setUseMockData(!useMockData)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            useMockData
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'bg-slate-700/50 text-slate-400'
          }`}
        >
          {useMockData ? '模拟数据' : '实时数据'}
        </button>
      </div>

      <div className="absolute left-1/2 top-16 -translate-x-1/2 z-30 pointer-events-none">
        <div className="relative">
          <div className="absolute -top-1 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
          <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
        </div>
      </div>
    </div>
  );
};
