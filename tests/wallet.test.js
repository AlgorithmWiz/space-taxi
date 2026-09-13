import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FareWallet, emptyWallet, parseWallet, creditFare, chooseSkin } from '../src/wallet.js';
import { Flight } from '../src/physics.js';
import { LEVELS } from '../src/levels.js';
import { EXIT } from '../src/environment.js';
import { checkpoint } from '../src/progress.js';
import { SKINS } from '../src/skins.js';

const receipt = (riderIndex = 0, earned = 500) => ({ runId: 'test-run', sector: 0, riderIndex, earned });
const memoryStorage = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; };
const bank = (wallet, rides = 7) => { for (let i = 0; i < rides; i++) wallet.credit(receipt(i)); };
test('fares accumulate across shifts and only successful rides earn garage credits', () => {
  let state = creditFare(emptyWallet(), receipt());
  state = creditFare(state, { ...receipt(), runId: 'next-shift' });
  assert.equal(state.balance, 1000); assert.equal(state.earned, 1000);
  for (const earned of [-100, NaN, 1.5, 501, Infinity]) assert.equal(creditFare(state, receipt(1, earned)), state);
});
test('each receipt is credited once, including after storage reload', () => {
  const storage = memoryStorage(), wallet = new FareWallet({ storage });
  assert.equal(wallet.credit(receipt()), 500);
  const resumed = new FareWallet({ storage });
  assert.equal(resumed.credit(receipt(0, 490)), 0);
  assert.equal(resumed.state.balance, 500); assert.equal(resumed.credit(receipt(1)), 500);
});
test('buying a skin debits the stated price once; owned skins are free to equip', () => {
  let state = { ...emptyWallet(), balance: 3500, earned: 3500 };
  const bought = chooseSkin(state, 'lagoon'); assert.equal(bought.ok, true); state = bought.state;
  assert.equal(state.balance, 500); assert.equal(state.earned, 3500); assert.equal(state.equipped, 'lagoon');
  state = chooseSkin(state, 'classic').state; state = chooseSkin(state, 'lagoon').state;
  assert.equal(state.balance, 500); assert.deepEqual(state.owned, ['classic', 'lagoon']);
  assert.equal(chooseSkin(state, 'auric').ok, false); assert.equal(chooseSkin(state, 'unknown').state, state);
});
test('balance, ownership and equipped skin survive a browser reload', () => {
  const storage = memoryStorage(), wallet = new FareWallet({ storage });
  bank(wallet); wallet.choose('lagoon');
  const restored = new FareWallet({ storage });
  assert.deepEqual(restored.state, wallet.state);
  const secondTab = new FareWallet({ storage }); secondTab.credit(receipt(7));
  restored.choose('classic'); assert.equal(restored.state.balance, 1000);
});
test('corrupt data is sanitized and unavailable storage retains a usable session wallet', () => {
  assert.deepEqual(parseWallet('{broken'), emptyWallet());
  assert.deepEqual(parseWallet('{"version":1,"balance":-2}'), emptyWallet());
  const state = parseWallet(JSON.stringify({ version: 1, balance: 80, owned: ['bogus'], equipped: 'auric', receipts: ['wrong', 'test-run:0:0'] }));
  assert.deepEqual(state.owned, ['classic']); assert.equal(state.equipped, 'classic'); assert.equal(state.receipts.length, 1);
  const wallet = new FareWallet({ storage: { getItem() { throw new Error('blocked'); } } });
  bank(wallet); assert.equal(wallet.saved, false);
  assert.equal(wallet.choose('lagoon').ok, true); assert.equal(wallet.state.balance, 500);
  const quota = new FareWallet({ storage: { getItem: () => null, setItem() { throw new Error('quota'); } } });
  quota.credit(receipt()); quota.refresh(); assert.equal(quota.state.balance, 500); assert.equal(quota.saved, false);
});
test('every normal and exit fare in all 28 levels emits one wallet reward; completion bonuses do not', () => {
  for (let sector = 0; sector < LEVELS.length; sector++) {
    const rewards = [], flight = new Flight(e => { if (e.type === 'fare-earned') rewards.push(e); });
    flight.reset(sector); flight.time = 40;
    while (flight.route) {
      const [pickup, destination] = flight.route, riderIndex = flight.routeIndex;
      flight.service(flight.level.pads.find(p => p.id === pickup), 1);
      assert.equal(rewards.length, riderIndex, 'boarding must not credit a fare');
      if (destination === EXIT) flight.finishLevel(); else flight.service(flight.level.pads.find(p => p.id === destination), 1);
      assert.equal(rewards.length, riderIndex + 1); assert.equal(rewards.at(-1).earned, 500);
      assert.equal(rewards.at(-1).sector, sector); assert.equal(rewards.at(-1).runId, flight.runId);
    }
    const wallet = rewards.reduce((state, event) => creditFare(state, event), emptyWallet());
    assert.equal(wallet.balance, flight.routes.length * 500);
  }
});
test('replaying a saved level cannot farm its fares, but a new shift can earn again', () => {
  const storage = memoryStorage(), wallet = new FareWallet({ storage });
  const award = e => { if (e.type === 'fare-earned') wallet.credit(e); };
  const flight = new Flight(award), saved = checkpoint(flight);
  flight.service(flight.level.pads[0], 1); flight.finishLevel();
  assert.equal(wallet.state.balance, 500);
  const resumed = new Flight(award); Object.assign(resumed, saved); resumed.loadSector(saved.sector);
  resumed.service(resumed.level.pads[0], 1); resumed.finishLevel();
  assert.equal(wallet.state.balance, 500);
  resumed.reset(); resumed.service(resumed.level.pads[0], 1); resumed.finishLevel();
  assert.equal(wallet.state.balance, 1000);
  for (let i = 0; i < 4; i++) wallet.credit({ ...receipt(i), runId: 'another-shift' });
  assert.equal(wallet.choose('lagoon').ok, true); assert.equal(wallet.state.balance, 0);
  assert.equal(resumed.score, 750, 'garage purchases must not change run score');
});
test('rare skins require both the campaign milestone and their full fare price', () => {
  for (const skin of SKINS.filter(s => s.requiredLevel)) {
    const before = { ...emptyWallet(), balance: skin.price, earned: skin.price, campaignLevel: skin.requiredLevel - 1 };
    const locked = chooseSkin(before, skin.id);
    assert.equal(locked.ok, false); assert.equal(locked.state, before);
    assert.match(locked.reason, new RegExp(`level ${skin.requiredLevel}`));
    const poor = { ...before, campaignLevel: skin.requiredLevel, balance: skin.price - 1 };
    assert.equal(chooseSkin(poor, skin.id).ok, false); assert.equal(poor.balance, skin.price - 1);
    const eligible = { ...before, campaignLevel: skin.requiredLevel };
    const bought = chooseSkin(eligible, skin.id);
    assert.equal(bought.ok, true); assert.equal(bought.state.balance, 0); assert.equal(bought.state.equipped, skin.id);
    assert.equal(chooseSkin(bought.state, skin.id).state.balance, 0);
  }
});
test('earned campaign milestones persist through reloads, new shifts and unrelated atlas departures', () => {
  const storage = memoryStorage(), wallet = new FareWallet({ storage });
  wallet.syncProgress({ cleared: [15], checkpoint: { sector: 16, startSector: 15 } });
  assert.equal(wallet.state.campaignLevel, 1);
  wallet.syncProgress({ cleared: [0, 1, 2, 3, 4, 5, 6] });
  assert.equal(wallet.state.campaignLevel, 8);
  const restored = new FareWallet({ storage });
  restored.syncProgress({ cleared: [], checkpoint: checkpoint(new Flight()) });
  assert.equal(restored.state.campaignLevel, 8);
  const parallel = new FareWallet({ storage });
  parallel.syncProgress({ checkpoint: { startSector: 0, sector: 15 } });
  restored.credit(receipt()); assert.equal(restored.state.campaignLevel, 16);
});
test('older wallets retain all purchased skins and funds when milestone requirements are added', () => {
  const legacy = { ...emptyWallet(), balance: 200, earned: 50000, owned: SKINS.map(s => s.id), equipped: 'auric' };
  delete legacy.campaignLevel;
  const migrated = parseWallet(JSON.stringify(legacy));
  assert.equal(migrated.campaignLevel, 1); assert.equal(migrated.balance, 200); assert.equal(migrated.equipped, 'auric');
  for (const skin of SKINS) {
    const equipped = chooseSkin(migrated, skin.id);
    assert.equal(equipped.ok, true); assert.equal(equipped.state.balance, 200);
  }
  for (const badLevel of [-1, 0, 25, 99, '24', 16.5, null]) assert.equal(parseWallet(JSON.stringify({ ...legacy, campaignLevel: badLevel })).campaignLevel, 1);
});
