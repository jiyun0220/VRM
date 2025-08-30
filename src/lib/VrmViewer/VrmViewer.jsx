import React, { useRef, useEffect } from 'react';
import { VrmManager } from './vrmManager';

const VrmViewer = ({ modelUrl, audio }) => {
  const canvasRef = useRef(null);
  const vrmManagerRef = useRef(null);

  useEffect(() => {
    if (!vrmManagerRef.current) {
      const manager = new VrmManager();
      vrmManagerRef.current = manager;
      manager.initialize(canvasRef.current);
    }

    return () => {
      if (vrmManagerRef.current) {
        vrmManagerRef.current.dispose();
        vrmManagerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (modelUrl && vrmManagerRef.current) {
      vrmManagerRef.current.loadVrm(modelUrl);
    }
  }, [modelUrl]);

  useEffect(() => {
    if (audio && vrmManagerRef.current) {
      vrmManagerRef.current.setupLipSync(audio);
    }
  }, [audio]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ width: '100%', height: '100%', display: 'block' }} 
    />
  );
};

export default VrmViewer;