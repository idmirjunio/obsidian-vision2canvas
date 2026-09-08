// Obsidian Canvas v1 Specification Types
export type CanvasNodeType = 'text' | 'file' | 'link' | 'group';

export type CanvasNodeColor = '1' | '2' | '3' | '4' | '5' | '6';

export interface CanvasNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: CanvasNodeType;
  text?: string;
  file?: string;
  url?: string;
  label?: string; // Group label
  color?: CanvasNodeColor;
  background?: string;
  styleAttributes?: Record<string, unknown>;
}

export type NodeSide = 'top' | 'right' | 'bottom' | 'left';

export interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide?: NodeSide;
  fromEnd?: 'none' | 'arrow';
  toNode: string;
  toSide?: NodeSide;
  toEnd?: 'none' | 'arrow';
  label?: string;
  color?: CanvasNodeColor;
}

export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

// Vision AI Output Schema Interface
export interface AIVisionNode {
  id?: string;
  title?: string;
  content: string;
  type?: 'text' | 'group';
  sectionIndex?: number; // e.g. 1..4 columns
  gridPos?: {
    col: number; // 1-based column index
    row: number; // 1-based row index
  };
  relativeBox?: {
    x: number;      // 0..1000
    y: number;      // 0..1000
    width: number;  // 0..1000
    height: number; // 0..1000
  };
  category?: string;
  color?: CanvasNodeColor;
}

export interface AIVisionEdge {
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  arrowDirection?: 'forward' | 'both' | 'none';
}

export interface AIVisionGroup {
  id: string;
  title: string;
  nodeIds: string[];
  color?: CanvasNodeColor;
}

export interface VisionAnalysisResult {
  title?: string;
  nodes: AIVisionNode[];
  edges?: AIVisionEdge[];
  groups?: AIVisionGroup[];
}

// Plugin Settings Interface
export interface Vision2CanvasSettings {
  aiProvider: 'local' | 'remote';
  apiEndpoint: string;
  apiKey: string;
  modelName: string;
  customPrompt: string;
  outputFolder: string;
  canvasScaleX: number;
  canvasScaleY: number;
  cardWidth: number;
  cardHeight: number;
  autoOpenCanvas: boolean;
}

export const DEFAULT_SETTINGS: Vision2CanvasSettings = {
  aiProvider: 'remote',
  apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: '',
  modelName: 'gemini-flash-latest',
  customPrompt: '',
  outputFolder: '',
  canvasScaleX: 2.5,
  canvasScaleY: 2.0,
  cardWidth: 320,
  cardHeight: 180,
  autoOpenCanvas: true,
};
