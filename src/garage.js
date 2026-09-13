import { SKINS, skinById } from './skins.js';
import { skinAccess } from './wallet.js';

const money = value => value.toLocaleString('en-US');
export class Garage {
  constructor({ wallet, world, onChange = () => {}, root = document }) {
    this.wallet = wallet; this.world = world; this.onChange = onChange; this.root = root;
    this.$ = id => root.getElementById(id); this.selected = wallet.state.equipped; this.portraits = null;
    this.$('close-garage').addEventListener('click', () => this.$('garage-dialog').close());
    this.$('garage-dialog').addEventListener('close', () => { world.setSkin(skinById(wallet.state.equipped)); });
    this.$('garage-action').addEventListener('click', () => {
      const result = wallet.choose(this.selected);
      this.render();
      this.$('garage-message').textContent = result.ok ? `${skinById(this.selected).name} ${result.purchased ? 'unlocked and' : 'is'} equipped. ${wallet.saved ? 'Ready for your next shift.' : 'Available for this session.'}` : result.reason;
      if (result.ok) this.onChange();
    });
    this.refresh();
  }
  refresh() {
    const state = this.wallet.refresh();
    this.$('wallet-balance').textContent = `${money(state.balance)} CR`;
    this.$('taxi-skin-name').textContent = skinById(state.equipped).name;
    this.world.setSkin(skinById(state.equipped));
  }
  open() {
    this.refresh(); this.selected = this.wallet.state.equipped;
    if (!this.portraits) this.portraits = this.world.createSkinPortraits();
    this.$('garage-message').textContent = '';
    this.render(); this.$('garage-dialog').showModal();
  }
  render() {
    const state = this.wallet.state, skin = skinById(this.selected), owned = state.owned.includes(skin.id), equipped = state.equipped === skin.id;
    const access = skinAccess(state, skin);
    this.$('garage-balance').textContent = `${money(state.balance)} CR`;
    this.$('garage-earned').textContent = `${money(state.earned)} CR earned · Campaign level ${state.campaignLevel} / 24`;
    this.$('garage-storage').textContent = this.wallet.saved ? 'Saved in this browser. Your wallet and skins carry over between shifts.' : 'Storage unavailable. Wallet and skins are available for this session only.';
    this.$('garage-grid').replaceChildren(...SKINS.map(item => {
      const itemAccess = skinAccess(state, item);
      const button = this.root.createElement('button'); button.className = `skin-card${item.id === skin.id ? ' selected' : ''}${itemAccess.locked ? ' level-locked' : ''}`; button.dataset.skin = item.id;
      button.setAttribute('aria-pressed', String(item.id === skin.id)); button.setAttribute('aria-label', `${item.name}, ${itemAccess.owned ? 'owned' : `${money(item.price)} credits${itemAccess.locked ? `, requires campaign level ${itemAccess.requiredLevel}` : ''}`}`);
      const img = this.root.createElement('img'); img.src = this.portraits[item.id]; img.alt = ''; img.width = 320; img.height = 190;
      const name = this.root.createElement('b'); name.textContent = item.name;
      const price = this.root.createElement('span'); price.textContent = state.equipped === item.id ? '✓ EQUIPPED' : state.owned.includes(item.id) ? 'OWNED' : `${money(item.price)} CR`;
      const milestone = this.root.createElement('small'); milestone.className = 'skin-unlock';
      milestone.textContent = itemAccess.owned ? 'IN YOUR COLLECTION' : itemAccess.locked ? `LEVEL ${itemAccess.requiredLevel} REQUIRED` : item.requiredLevel ? `✓ LEVEL ${itemAccess.requiredLevel} REACHED` : 'FARES ONLY';
      button.append(img, name, price, milestone); button.addEventListener('click', () => {
        this.selected = item.id; this.$('garage-message').textContent = ''; this.render(); this.world.setSkin(item);
        this.$('garage-grid').querySelector(`[data-skin="${item.id}"]`).focus({ preventScroll: true });
        if (this.root.defaultView?.matchMedia('(max-width: 700px)').matches) {
          this.$('garage-name').focus({ preventScroll: true });
          this.$('garage-name').closest('.garage-showcase').scrollIntoView({ block: 'start' });
        }
      }); return button;
    }));
    this.$('garage-preview').src = this.portraits[skin.id];
    this.$('garage-preview').alt = `${skin.name} taxi skin preview`;
    this.$('garage-tag').textContent = skin.tag; this.$('garage-name').textContent = skin.name;
    this.$('garage-description').textContent = skin.description;
    const action = this.$('garage-action'); action.disabled = equipped || access.locked || access.shortfall > 0;
    action.textContent = equipped ? 'EQUIPPED ✓' : owned ? 'EQUIP SKIN ↗' : access.locked ? `LOCKED · REACH LEVEL ${access.requiredLevel}` : `BUY & EQUIP · ${money(skin.price)} CR`;
    this.$('garage-requirement').classList.toggle('hidden', owned || !skin.requiredLevel);
    this.$('garage-milestone').textContent = access.locked ? `CAMPAIGN LEVEL ${state.campaignLevel} / ${access.requiredLevel}` : `✓ LEVEL ${access.requiredLevel} MILESTONE REACHED`;
    const meter = this.$('garage-level-progress'); meter.max = Math.max(1, access.requiredLevel - 1); meter.value = Math.min(state.campaignLevel - 1, meter.max);
    meter.setAttribute('aria-label', `Campaign level ${state.campaignLevel}; reach level ${access.requiredLevel} to unlock`);
    this.$('garage-shortfall').textContent = owned ? 'Yours to keep. Switch skins any time between shifts.' : access.locked ? `${money(skin.price)} CR after reaching level ${access.requiredLevel}. ${access.shortfall ? `${money(access.shortfall)} more credits needed.` : 'You already have enough credits.'}` : access.shortfall ? `${money(access.shortfall)} more credits needed. Complete rides to earn fares.` : 'One purchase. Yours for every future shift.';
    this.$('wallet-balance').textContent = `${money(state.balance)} CR`;
    this.$('taxi-skin-name').textContent = skinById(state.equipped).name;
  }
}
