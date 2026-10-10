import { useEffect, useRef } from 'react';

export type ShortcutScope = 'dialog' | 'sheet' | 'screen' | 'global';

export interface ShortcutItem {
  id: string;
  keys: string[];
  label: string;
  group: 'Global' | 'Guide & Role' | 'Night & Vote' | 'Discussion' | 'Lobby' | 'God Mode';
  scope: ShortcutScope;
  description: string;
}

export const SHORTCUTS: ShortcutItem[] = [
  // Global
  { id: 'toggle-help', keys: ['?', 'h', 'H'], label: 'H / ?', group: 'Guide & Role', scope: 'global', description: 'Toggle How to Play & Role Guide' },
  { id: 'my-role', keys: ['i', 'I'], label: 'I', group: 'Guide & Role', scope: 'global', description: 'Open Guide directly to My Role' },
  { id: 'peek-role', keys: ['r', 'R'], label: 'Hold R', group: 'Guide & Role', scope: 'screen', description: 'Hold to peek secret role HUD' },
  { id: 'escape', keys: ['Escape'], label: 'Esc', group: 'Global', scope: 'global', description: 'Close active drawer / modal or blur input' },
  { id: 'toggle-sound', keys: ['m', 'M'], label: 'M', group: 'Global', scope: 'global', description: 'Toggle audio sound effects' },
  { id: 'focus-chat', keys: ['c', 'C', '/'], label: 'C or /', group: 'Global', scope: 'screen', description: 'Focus chat input' },
  // Help Sheet
  { id: 'tab-1', keys: ['1'], label: '1', group: 'Guide & Role', scope: 'sheet', description: 'Basics tab' },
  { id: 'tab-2', keys: ['2'], label: '2', group: 'Guide & Role', scope: 'sheet', description: 'My Role tab' },
  { id: 'tab-3', keys: ['3'], label: '3', group: 'Guide & Role', scope: 'sheet', description: 'Roles tab' },
  { id: 'tab-4', keys: ['4'], label: '4', group: 'Guide & Role', scope: 'sheet', description: 'Rules tab' },
  { id: 'tab-5', keys: ['5'], label: '5', group: 'Guide & Role', scope: 'sheet', description: 'Log tab' },
  { id: 'tab-6', keys: ['6'], label: '6', group: 'Guide & Role', scope: 'sheet', description: 'Notes tab' },
  { id: 'tab-7', keys: ['7'], label: '7', group: 'Guide & Role', scope: 'sheet', description: 'Keys tab' },
  { id: 'tab-prev', keys: ['ArrowLeft'], label: '←', group: 'Guide & Role', scope: 'sheet', description: 'Previous tab' },
  { id: 'tab-next', keys: ['ArrowRight'], label: '→', group: 'Guide & Role', scope: 'sheet', description: 'Next tab' },
  // Night & Vote
  { id: 'select-player', keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], label: '1-9, 0', group: 'Night & Vote', scope: 'screen', description: 'Quick-select player slot' },
  { id: 'confirm-target', keys: ['y', 'Y', 'Enter'], label: 'Y / Enter', group: 'Night & Vote', scope: 'dialog', description: 'Confirm selection' },
  { id: 'cancel-target', keys: ['n', 'N', 'Escape'], label: 'N / Esc', group: 'Night & Vote', scope: 'dialog', description: 'Cancel selection' },
  { id: 'skip-vote', keys: ['s', 'S'], label: 'S', group: 'Night & Vote', scope: 'screen', description: 'Select Skip vote' },
  { id: 'hold-fire', keys: ['x', 'X'], label: 'X', group: 'Night & Vote', scope: 'screen', description: 'Hold Fire (Vigilante)' },
  // Discussion
  { id: 'ready-to-vote', keys: ['v', 'V'], label: 'V', group: 'Discussion', scope: 'screen', description: 'Toggle Ready to vote' },
  // Lobby
  { id: 'toggle-ready', keys: ['Shift+Enter'], label: 'Shift+Enter', group: 'Lobby', scope: 'screen', description: 'Toggle ready state' },
  { id: 'copy-link', keys: ['Shift+C'], label: 'Shift+C', group: 'Lobby', scope: 'screen', description: 'Copy invite link' },
  { id: 'start-game', keys: ['Ctrl+Enter', 'Meta+Enter'], label: 'Ctrl+Enter', group: 'Lobby', scope: 'screen', description: 'Start game (Host only)' },
  // God Mode
  { id: 'god-next', keys: ['Shift+N'], label: 'Shift+N', group: 'God Mode', scope: 'screen', description: 'Advance next phase' },
  { id: 'god-end', keys: ['Shift+E'], label: 'Shift+E', group: 'God Mode', scope: 'screen', description: 'Force end night / vote' },
  { id: 'god-pause', keys: ['Shift+P'], label: 'Shift+P', group: 'God Mode', scope: 'screen', description: 'Pause / resume timer' },
  { id: 'god-extend', keys: ['Shift+X'], label: 'Shift+X', group: 'God Mode', scope: 'screen', description: 'Extend timer +30s' },
  { id: 'god-skip', keys: ['Shift+S'], label: 'Shift+S', group: 'God Mode', scope: 'screen', description: 'Skip phase' },
];

// Active scope stack manager
const activeScopes: ShortcutScope[] = ['global'];

export function pushScope(scope: ShortcutScope) {
  activeScopes.push(scope);
}

export function popScope(scope: ShortcutScope) {
  const index = activeScopes.lastIndexOf(scope);
  if (index !== -1) {
    activeScopes.splice(index, 1);
  }
}

export function getCurrentScope(): ShortcutScope {
  return activeScopes[activeScopes.length - 1] || 'global';
}

export interface UseShortcutOptions {
  scope?: ShortcutScope;
  enabled?: boolean;
  preventDefault?: boolean;
}

export function useShortcut(
  keys: string | string[],
  callback: (e: KeyboardEvent) => void,
  options: UseShortcutOptions = {}
) {
  const { scope = 'screen', enabled = true, preventDefault = true } = options;
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).isContentEditable);

      // In input fields, allow Esc to blur and Enter in chat
      if (isInput) {
        if (e.key === 'Escape') {
          (activeElement as HTMLElement).blur();
          return;
        }
        if (e.key !== 'Enter') {
          return;
        }
      }

      // Check current scope priority
      const current = getCurrentScope();
      if (scope !== 'global' && current !== scope) {
        return;
      }

      const keyList = Array.isArray(keys) ? keys : [keys];
      const match = keyList.some((k) => {
        if (k.includes('+')) {
          const parts = k.split('+');
          const modifier = parts[0].toLowerCase();
          const mainKey = parts[1].toLowerCase();

          const modPressed =
            (modifier === 'shift' && e.shiftKey) ||
            (modifier === 'ctrl' && e.ctrlKey) ||
            (modifier === 'meta' && e.metaKey);

          return modPressed && e.key.toLowerCase() === mainKey;
        }
        return e.key.toLowerCase() === k.toLowerCase();
      });

      if (match) {
        if (preventDefault) {
          e.preventDefault();
        }
        callbackRef.current(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keys, scope, enabled, preventDefault]);
}
