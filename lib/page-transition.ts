type Listener = () => void;
const listeners: Listener[] = [];

export function triggerPageTransition(): void {
  for (const l of listeners) l();
}

export function subscribePageTransition(l: Listener): () => void {
  listeners.push(l);
  return () => {
    const i = listeners.indexOf(l);
    if (i >= 0) listeners.splice(i, 1);
  };
}
