import { useCallback, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, File, X } from 'lucide-react';
import { FileFormat } from './types';
import { useTauriFileDrop, isTauri } from '../../../hooks/useTauriFileDrop';

interface FileUploadZoneProps {
  file: File | null;
  format: FileFormat;
  detectedFormat: FileFormat | null;
  onFileSelect: (file: File, format: FileFormat) => void;
  onClear: () => void;
  disabled?: boolean;
}

const formatLabels: Record<FileFormat, string> = {
  auto: 'Auto-detect',
  json: 'JSON Array',
  jsonl: 'JSON Lines',
  csv: 'CSV',
};

export function FileUploadZone({
  file,
  format,
  detectedFormat,
  onFileSelect,
  onClear,
  disabled,
}: FileUploadZoneProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Handle Tauri file drop events
  useTauriFileDrop({
    enabled: !disabled && !file,
    onFileDrop: useCallback((paths: string[]) => {
      console.log('[FileUploadZone] Tauri file drop paths:', paths);
      
      // Load file using Tauri invoke
      const loadFile = async () => {
        try {
          const firstPath = paths[0];
          const fileName = firstPath.split('/').pop() || firstPath.split('\\').pop() || 'dropped-file';
          
          // Use Tauri invoke to read file
          const { invoke } = await import('@tauri-apps/api/core');
          const content: number[] = await invoke('read_file', { filePath: firstPath });
          const uint8Array = new Uint8Array(content);
          
          const droppedFile = new window.File([uint8Array], fileName, { 
            type: 'application/octet-stream' 
          });
          
          onFileSelect(droppedFile, format);
        } catch (err) {
          console.error('[FileUploadZone] Failed to read dropped file:', err);
          alert(t('producer.fileMode.upload.dropError', 'Failed to read dropped file. Please use file picker instead.'));
        }
      };
      
      loadFile();
    }, [format, onFileSelect, t]),
  });

  // Prevent default drag behavior on window to avoid file being opened in browser
  useEffect(() => {
    if (!isTauri()) {
      // Only needed for web/non-Tauri environments
      const preventDefault = (e: DragEvent) => {
        e.preventDefault();
      };
      
      window.addEventListener('dragover', preventDefault);
      window.addEventListener('drop', preventDefault);
      
      return () => {
        window.removeEventListener('dragover', preventDefault);
        window.removeEventListener('drop', preventDefault);
      };
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      onFileSelect(droppedFile, format);
    }
  }, [format, onFileSelect, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    // Indicate that dropping is allowed
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile, format);
    }
  }, [format, onFileSelect]);

  const handleFormatChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFormat = e.target.value as FileFormat;
    if (file) {
      onFileSelect(file, newFormat);
    }
  }, [file, onFileSelect]);

  return (
    <div className="space-y-4">
      {/* Format selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">{t('producer.fileMode.upload.format')}:</label>
        <select
          value={format}
          onChange={handleFormatChange}
          disabled={disabled}
          className="px-3 py-1.5 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="auto">{t('producer.fileMode.upload.formatAuto')}</option>
          <option value="json">{t('producer.fileMode.upload.formatJson')}</option>
          <option value="jsonl">{t('producer.fileMode.upload.formatJsonl')}</option>
          <option value="csv">{t('producer.fileMode.upload.formatCsv')}</option>
        </select>
        {detectedFormat && detectedFormat !== 'auto' && (
          <span className="text-sm text-muted-foreground">
            {t('producer.fileMode.upload.detected')}: {formatLabels[detectedFormat]}
          </span>
        )}
      </div>

      {/* Upload zone */}
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-12
            flex flex-col items-center justify-center gap-4
            transition-colors
            ${isDragging 
              ? 'border-primary bg-primary/10' 
              : 'border-border hover:border-primary hover:bg-primary/5'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Upload className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">{t('producer.fileMode.upload.dragDrop')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('producer.fileMode.upload.clickToSelect')}
            </p>
          </div>
          <div className="flex gap-2 mt-2">
            <span className="text-xs px-2 py-1 bg-muted rounded">JSON</span>
            <span className="text-xs px-2 py-1 bg-muted rounded">JSONL</span>
            <span className="text-xs px-2 py-1 bg-muted rounded">CSV</span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".json,.jsonl,.csv,.txt,.ndjson"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="border border-border rounded-lg p-6 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <File className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB • {formatLabels[detectedFormat || format]}
                </p>
              </div>
            </div>
            {!disabled && (
              <button
                onClick={onClear}
                className="p-2 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
