export type View =
  | { kind: 'overview' }
  | { kind: 'module'; moduleId: string }
  | { kind: 'analytics' }
  | { kind: 'pulseConfig' };
