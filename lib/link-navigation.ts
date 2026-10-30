type LinkClick = {
  button: number;
  defaultPrevented: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  preventDefault: () => void;
};

// Handle ordinary in-page navigation without stealing native new-tab/window actions.
export function openOnPlainClick(event: LinkClick, action: () => void) {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  action();
}
