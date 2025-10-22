let handler = null;

export function setErrorHandler(fn) {
  handler = fn;
}

export function dispatchError(message) {
  if (typeof handler === 'function') {
    handler(message);
  }
}
