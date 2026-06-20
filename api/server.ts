import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import type { TbmPoseData } from '../src/types/tbm';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

class PoseSimulator {
  private startTime: number = 0;
  private ringCount: number = 0;
  private lastRingTime: number = 0;
  private totalSegments: number = 2000;
  private segmentWidth: number = 1.5;

  constructor() {
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

    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(max, value));

    return {
      timestamp: Date.now(),
      position: {
        x: x + noiseX,
        y: y + noiseY,
        z: z + noiseZ,
      },
      rotation: {
        pitch: clamp(pitch, -5, 5),
        yaw: clamp(yaw, -5, 5),
        roll: clamp(roll, -5, 5),
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
}

const simulator = new PoseSimulator();

wss.on('connection', (ws) => {
  console.log('Client connected');

  const initialPose = {
    timestamp: Date.now(),
    position: { x: 0, y: 0, z: 0 },
    rotation: { pitch: 0, yaw: 0, roll: 0 },
    cutterHead: { speed: 0, torque: 0, rotation: 0 },
    thrust: { totalForce: 0, speed: 0 },
    ringCount: 0,
    mileage: 0,
  };

  ws.send(JSON.stringify({
    type: 'pose',
    data: initialPose,
    timestamp: Date.now(),
  }));

  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      const pose = simulator.generatePose();
      ws.send(JSON.stringify({
        type: 'pose',
        data: pose,
        timestamp: Date.now(),
      }));
    }
  }, 100);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'heartbeat') {
        ws.send(JSON.stringify({
          type: 'status',
          data: { connected: true, latency: Date.now() - data.timestamp },
          timestamp: Date.now(),
        }));
      }
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clearInterval(interval);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clearInterval(interval);
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/models', (req, res) => {
  res.json([
    {
      id: 'demo-tunnel-001',
      name: '示范隧道工程',
      size: 156789000,
      uploadTime: Date.now() - 86400000,
    },
  ]);
});

app.get('/api/history', (req, res) => {
  const { startTime, endTime } = req.query;
  const history: TbmPoseData[] = [];

  for (let i = 0; i < 60; i++) {
    const timestamp = Date.now() - (60 - i) * 1000;
    const elapsed = i / 10;
    history.push({
      timestamp,
      position: {
        x: i * 0.02,
        y: Math.sin(elapsed) * 0.5,
        z: Math.cos(elapsed) * 0.3,
      },
      rotation: {
        pitch: Math.sin(elapsed * 0.5) * 2,
        yaw: Math.cos(elapsed * 0.3) * 1.5,
        roll: Math.sin(elapsed * 0.7) * 1,
      },
      cutterHead: {
        speed: 3 + Math.sin(elapsed) * 0.5,
        torque: 3500 + Math.sin(elapsed * 0.3) * 500,
        rotation: (elapsed * 3 * 360) / 60,
      },
      thrust: {
        totalForce: 15000 + Math.sin(elapsed * 0.2) * 2000,
        speed: 40 + Math.sin(elapsed * 0.25) * 10,
      },
      ringCount: Math.floor(i / 10),
      mileage: Math.floor(i / 10) * 1.5,
    });
  }

  res.json(history);
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
});
