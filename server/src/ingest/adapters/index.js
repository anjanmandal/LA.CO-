import { traceSectorAdapter } from './traceSectorAdapter.js';
import { operatorGenericAdapter } from './operatorGenericAdapter.js';

export const adapters = [traceSectorAdapter, operatorGenericAdapter];

export function detectAdapter(headers) {
  for (const a of adapters) {
    if (a.detect(headers)) return a;
  }
  // default: TRACE first
  return traceSectorAdapter;
}
