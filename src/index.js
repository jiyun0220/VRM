import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import VrmViewer from './lib/VrmViewer/VrmViewer';

const App = () => {
  const modelHanaUrl = '/models/하나.vrm';
  const modelMinsuUrl = '/models/민수.vrm';
  const [modelUrl, setModelUrl] = useState(modelHanaUrl);
  const buttonStyle = {
    position: 'absolute',
    top: '10px',
    left: '10px',
    zIndex: 10,
    padding: '10px',
    marginRight: '10px'
  };
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
        <button style={{padding: '10px', marginRight: '10px'}} onClick={() => setModelUrl(modelHanaUrl)}>하나</button>
        <button style={{padding: '10px'}} onClick={() => setModelUrl(modelMinsuUrl)}>민수</button>
      </div>
      <VrmViewer modelUrl={modelUrl} />
    </div>
  );
};
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);