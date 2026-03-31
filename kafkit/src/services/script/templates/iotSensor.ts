import type { ScriptTemplate } from '../../../types/script';

export const iotSensorTemplate: ScriptTemplate = {
  id: 'iot-sensor',
  name: 'IoT Sensor Data',
  description: 'Simulate temperature, humidity, and pressure sensors',
  category: 'iot',
  script: `function generate(ctx) {
  // Device ID based on index
  const deviceId = \`sensor_\${(ctx.index % 10) + 1}\`;
  
  // Simulate temperature with random fluctuation
  const baseTemp = 22;
  const temp = baseTemp + ctx.randomFloat(-5, 5);
  
  // Simulate humidity (40-80%)
  const humidity = ctx.random(40, 80);
  
  // Simulate pressure (990-1010 hPa)
  const pressure = ctx.random(990, 1010);
  
  return {
    key: deviceId,
    value: {
      deviceId,
      timestamp: ctx.now(),
      readings: {
        temperature: parseFloat(temp.toFixed(2)),
        humidity,
        pressure
      },
      status: temp > 25 ? 'warning' : 'normal'
    },
    headers: {
      'sensor-type': 'environmental',
      'version': '1.0'
    }
  };
}`,
  defaultKeyStrategy: {
    type: 'roundrobin',
    partitionCount: 3
  }
};
