import React, { useState } from 'react';
import './App.css';
import Upload from './components/Upload';
import Download from './components/Download';

function App() {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <div className="App">
      <header className="app-header">
        <h1>🚀 Quick File Share</h1>
        <p>Share files instantly with a unique code - No login required!</p>
      </header>

      <div className="tab-container">
        <button 
          className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          📤 Upload File
        </button>
        <button 
          className={`tab-button ${activeTab === 'download' ? 'active' : ''}`}
          onClick={() => setActiveTab('download')}
        >
          📥 Download File
        </button>
      </div>

      <div className="content">
        {activeTab === 'upload' ? <Upload /> : <Download />}
      </div>

      <footer className="app-footer">
        <p>Files are automatically deleted after 24 hours | Max size: 100MB</p>
      </footer>
    </div>
  );
}

export default App;