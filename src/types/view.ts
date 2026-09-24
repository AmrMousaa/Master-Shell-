export type View =
  | { kind: 'overview' }
  | { kind: 'module'; moduleId: string }
  | { kind: 'analytics' }
  | { kind: 'pulseConfig' }
  // An app opened inside the shell, below the fixed topbar. `returnTo` is the
  // screen it was opened from, so closing it lands the user back there.
  | { kind: 'app'; appId: string; returnTo: Exclude<View, { kind: 'app' }> };
