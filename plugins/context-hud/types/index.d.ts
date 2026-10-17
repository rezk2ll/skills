export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

declare module 'claude-code' {
  interface PluginState {
    'context-hud': { limits: Limit[]; now: number; measured: boolean; lastTurnAt: number }
  }
}
