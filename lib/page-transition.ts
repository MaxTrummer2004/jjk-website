type Listener = () => void;

const triggerListeners: Listener[] = [];
const dismissListeners: Listener[] = [];

export function triggerPageTransition(): void {
  for (const l of triggerListeners) l();
}

export function dismissPageTransition(): void {
  for (const l of dismissListeners) l();
}

export function subscribePageTransition(l: Listener): () => void {
  triggerListeners.push(l);
  return () => {
    const i = triggerListeners.indexOf(l);
    if (i >= 0) triggerListeners.splice(i, 1);
  };
}

export function subscribePageTransitionDismiss(l: Listener): () => void {
  dismissListeners.push(l);
  return () => {
    const i = dismissListeners.indexOf(l);
    if (i >= 0) dismissListeners.splice(i, 1);
  };
}
