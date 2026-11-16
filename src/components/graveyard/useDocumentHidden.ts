/**
 * Tracks whether the browser tab is hidden. Infinite animations (ghost-drift,
 * fog-pulse) are paused while it is, per the motion rules.
 */
import { useEffect, useState } from 'preact/hooks';

function isHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

export function useDocumentHidden(): boolean {
  const [hidden, setHidden] = useState<boolean>(isHidden);

  useEffect(() => {
    const onChange = (): void => setHidden(isHidden());
    document.addEventListener('visibilitychange', onChange);
    onChange();
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return hidden;
}
