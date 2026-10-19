const keyFor = (address: string) => `nester_mainnet_ack_v1:${address}`;

export function hasAcknowledgedMainnet(address: string): boolean {
  if (!address) return false;
  try {
    return localStorage.getItem(keyFor(address)) !== null;
  } catch {
    return false;
  }
}

export function acknowledgeMainnet(address: string): void {
  if (!address) return;
  try {
    localStorage.setItem(keyFor(address), new Date().toISOString());
  } catch {
    // Storage unavailable: the user will be asked again next time.
  }
}
