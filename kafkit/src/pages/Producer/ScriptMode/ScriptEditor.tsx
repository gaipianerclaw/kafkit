import { useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface ScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  onValidate?: (errors: { message: string; line: number }[]) => void;
}

export function ScriptEditor({ 
  value, 
  onChange, 
  height = '300px',
  onValidate 
}: ScriptEditorProps) {
  const editorRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Configure JavaScript language features
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    });

    // Add type definitions for ctx
    const libSource = `
      declare interface ScriptContext {
        readonly index: number;
        readonly state: Record<string, any>;
        readonly timestamp: number;
        random(min: number, max: number): number;
        randomFloat(min: number, max: number): number;
        uuid(): string;
        timestamp(): number;
        now(): string;
        hash(str: string, algo: 'md5' | 'sha1' | 'sha256'): string;
        base64(str: string): string;
        readonly faker: {
          name(): string;
          email(): string;
          phone(): string;
          address(): string;
          company(): string;
          lorem(words: number): string;
        };
      }
      
      declare const ctx: ScriptContext;
      
      declare interface ScriptMessage {
        key: string | null;
        value: string | object;
        headers?: Record<string, string | number>;
      }
      
      declare function generate(ctx: ScriptContext): ScriptMessage | ScriptMessage[];
    `;
    
    monaco.languages.typescript.javascriptDefaults.addExtraLib(libSource, 'ts:filename/kafkit.d.ts');
    
    // Listen for validation errors
    if (onValidate) {
      const model = editor.getModel();
      if (model) {
        monaco.editor.onDidChangeMarkers(([uri]: any) => {
          if (uri.toString() === model.uri.toString()) {
            const markers = monaco.editor.getModelMarkers({ resource: uri });
            onValidate(markers.map((m: any) => ({
              message: m.message,
              line: m.startLineNumber
            })));
          }
        });
      }
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFullscreen}
          className="h-8 w-8 p-0"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      <Editor
        height={isFullscreen ? 'calc(100vh - 40px)' : height}
        defaultLanguage="javascript"
        value={value}
        onChange={(newValue) => onChange(newValue || '')}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          folding: true,
          foldingHighlight: true,
          showFoldingControls: 'always',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          quickSuggestions: true,
          parameterHints: { enabled: true },
        }}
        theme="vs-dark"
      />
    </div>
  );
}
