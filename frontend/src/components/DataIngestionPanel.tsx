import React, { useState, useRef } from 'react';
import { API_BASE } from '../api/client';

interface DataIngestionPanelProps {
  onGridLoaded: (gridData: any) => void;
  onProfilesLoaded: (profiles: any[]) => void;
}

export function DataIngestionPanel({ onGridLoaded, onProfilesLoaded }: DataIngestionPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const path = file.name.endsWith('.nc') ? '/api/ingest/netcdf' : '/api/ingest/text';
      const endpoint = `${API_BASE}${path}`;
      
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.statusText}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error parsing file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#050912] border-2 border-dashed border-white/20 rounded-xl p-4 font-mono text-[11px] text-gray-300">
      <div 
        className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-600 rounded cursor-pointer hover:bg-white/5 transition-colors text-center"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <span className="text-gray-400 font-bold mb-1">DRAG & DROP NetCDF (.nc) or CSV (.csv/.txt) HERE</span>
        <span className="text-[9px] text-gray-500">or click to browse</span>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={(e) => e.target.files && setFile(e.target.files[0])}
          accept=".nc,.csv,.txt"
        />
      </div>

      {file && (
        <div className="mt-3 bg-white/5 p-2 rounded flex justify-between items-center">
          <span className="truncate max-w-[200px] text-cyan-300 font-bold">{file.name}</span>
          <span className="text-[9px] text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
        </div>
      )}

      {error && (
        <div className="mt-2 text-red-400 bg-red-950/40 p-2 rounded border border-red-500/50">
          {error}
        </div>
      )}

      {file && !result && (
        <button
          onClick={handleUpload}
          disabled={loading}
          className="mt-3 w-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/30 py-1.5 rounded font-bold transition-colors disabled:opacity-50"
        >
          {loading ? 'Parsing...' : 'Upload & Parse'}
        </button>
      )}

      {result && (
        <div className="mt-3 space-y-2">
          <div className="text-emerald-400 font-bold">Successfully parsed!</div>
          <div className="text-[10px] text-gray-400">
            Detected variables: {result.variables?.join(', ') || 'N/A'}
          </div>
          <button
            onClick={() => {
              if (result.type === 'grid' || result.data) onGridLoaded(result.data || result);
              else onProfilesLoaded(result.profiles || []);
            }}
            className="w-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30 py-1.5 rounded font-bold transition-colors"
          >
            Load to Globe
          </button>
        </div>
      )}
    </div>
  );
}
