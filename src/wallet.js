import { SKINS } from './skins.js';
import { campaignLevelReached } from './progress.js';

export const WALLET_KEY = 'space-taxi-garage-v1';
const MAX_CREDITS = 1_000_000_000;
const validReceipt = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}:\d{1,2}:\d{1,3}$/.test(value);
export const emptyWallet = () => ({ version: 1, balance: 0, earned: 0, owned: ['classic'], equipped: 'classic', receipts: [], campaignLevel: 1 });
export function parseWallet(raw) {
  try {
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || !Number.isSafeInteger(value.balance) || value.balance < 0 || value.balance > MAX_CREDITS) return emptyWallet();
    const owned = [...new Set(['classic', ...(Array.isArray(value.owned) ? value.owned.filter(id => SKINS.some(s => s.id === id)) : [])])];
    return { version: 1, balance: value.balance, earned: Math.max(value.balance, Number.isSafeInteger(value.earned) && value.earned <= MAX_CREDITS ? value.earned : 0), owned,
      equipped: owned.includes(value.equipped) ? value.equipped : 'classic', receipts: [...new Set((Array.isArray(value.receipts) ? value.receipts : []).filter(validReceipt))],
      campaignLevel: Number.isInteger(value.campaignLevel) && value.campaignLevel >= 1 && value.campaignLevel <= 24 ? value.campaignLevel : 1 };
  } catch { return emptyWallet(); }
}
export function creditFare(state, { runId, sector, riderIndex, earned }) {
  const receipt = `${runId}:${sector}:${riderIndex}`;
  if (!validReceipt(receipt) || !Number.isInteger(sector) || sector < 0 || sector > 27 || !Number.isInteger(riderIndex) || riderIndex < 0 || riderIndex > 999 || !Number.isInteger(earned) || earned < 1 || earned > 500 || state.receipts.includes(receipt)) return state;
  return { ...state, balance: Math.min(MAX_CREDITS, state.balance + earned), earned: Math.min(MAX_CREDITS, state.earned + earned), receipts: [...state.receipts, receipt] };
}
export function skinAccess(state, skin) {
  const owned = state.owned.includes(skin.id), requiredLevel = skin.requiredLevel || 1;
  return { owned, requiredLevel, locked: !owned && (state.campaignLevel || 1) < requiredLevel,
    shortfall: owned ? 0 : Math.max(0, skin.price - state.balance) };
}
export function chooseSkin(state, id) {
  const skin = SKINS.find(s => s.id === id);
  if (!skin) return { state, ok: false, reason: 'Skin unavailable.' };
  if (skinAccess(state, skin).locked) return { state, ok: false, reason: `Reach campaign level ${skin.requiredLevel} to unlock ${skin.name}.` };
  const price = state.owned.includes(id) ? 0 : skin.price;
  if (price > state.balance) return { state, ok: false, reason: `Earn ${price - state.balance} more credits to unlock this skin.` };
  return { state: { ...state, balance: state.balance - price, owned: [...new Set([...state.owned, id])], equipped: id }, ok: true, purchased: price > 0 };
}
export class FareWallet {
  constructor({ storage, storageKey = WALLET_KEY } = {}) {
    this.key = storageKey; this.state = emptyWallet(); this.saved = true;
    try { this.storage = storage === undefined ? globalThis.localStorage : storage; if (!this.storage) this.saved = false; this.refresh(); } catch { this.saved = false; }
  }
  refresh() {
    if (this.saved) {
      try { this.state = parseWallet(this.storage.getItem(this.key)); } catch { this.saved = false; }
    }
    return this.state;
  }
  commit(next) {
    this.state = next;
    if (this.saved) { try { this.storage.setItem(this.key, JSON.stringify(next)); } catch { this.saved = false; } }
  }
  credit(event) {
    this.refresh(); const next = creditFare(this.state, event), added = next.balance - this.state.balance;
    if (next !== this.state) this.commit(next);
    return added;
  }
  syncProgress(progress) {
    this.refresh();
    const reached = campaignLevelReached(progress);
    if (reached > this.state.campaignLevel) this.commit({ ...this.state, campaignLevel: reached });
  }
  choose(id) {
    this.refresh(); const result = chooseSkin(this.state, id);
    if (result.ok) this.commit(result.state);
    return result;
  }
}
