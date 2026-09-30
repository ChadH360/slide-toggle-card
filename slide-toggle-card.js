/**
 * Slide Toggle Card for Home Assistant
 *
 * Inspired by the original slide-confirm card by itsbrianburton
 * (https://github.com/itsbrianburton/slide-confirm)
 */

var SLIDE_TOGGLE_VERSION = '0.5.0';
console.info('%c SLIDE-TOGGLE-CARD %c v' + SLIDE_TOGGLE_VERSION + ' ', 'color:#fff;background:#03a9f4;font-weight:bold;', 'color:#03a9f4;background:#fff;font-weight:bold;');

var KNOB_SIZE = 48;
var SLIDE_THRESHOLD = 0.75;
var UNKNOWN_HOLD_MS = 1000;

class SlideToggleCard extends HTMLElement {
  constructor() {
    super();
    this._config = null;
    this._hass = null;
    this._state = { dragging: false, startX: 0, currentX: 0, knobPosition: 0.5, snapBackTimeout: null };
  }

  set hass(hass) {
    var oldHass = this._hass;
    this._hass = hass;
    if (!this._config) return;
    var c = this._config;
    var s = hass.states[c.target_entity];
    var os = oldHass && oldHass.states ? oldHass.states[c.target_entity] : undefined;
    if ((s ? s.state : undefined) !== (os ? os.state : undefined))
      this._updateFromState(s ? s.state : undefined);
    if (!this.shadowRoot || !this.shadowRoot.querySelector('.stc')) this._render();
  }

  static getConfigForm() {
    return {
      schema: [
        {
          type: 'grid',
          name: '',
          flatten: true,
          schema: [
            { name: 'name', selector: { text: {} } },
            { name: 'icon', selector: { icon: {} } },
          ],
        },
        { name: 'target_entity', required: true, selector: { entity: {} } },
        { name: 'layout', selector: { select: { options: [
          { value: 'horizontal', label: 'Horizontal' },
          { value: 'vertical', label: 'Vertical (icon, name, slider)' },
        ], mode: 'dropdown' } } },
        {
          type: 'expandable',
          name: '',
          flatten: true,
          title: 'Entity States',
          schema: [
            {
              type: 'grid',
              name: '',
              flatten: true,
              schema: [
                { name: 'left_state', required: true, selector: { text: {} } },
                { name: 'right_state', required: true, selector: { text: {} } },
              ],
            },
            { name: 'unknown_state', selector: { select: { options: [
              { value: 'disabled', label: 'Disabled (greyed out)' },
              { value: 'enabled', label: 'Enabled (slideable from middle)' },
            ], mode: 'dropdown' } } },
          ],
        },
        {
          type: 'expandable',
          name: '',
          flatten: true,
          title: 'Slider Text',
          schema: [
            {
              type: 'grid',
              name: '',
              flatten: true,
              schema: [
                { name: 'left_text', required: true, selector: { text: {} } },
                { name: 'right_text', required: true, selector: { text: {} } },
              ],
            },
            {
              type: 'grid',
              name: '',
              flatten: true,
              schema: [
                { name: 'unknown_left_text', selector: { text: {} } },
                { name: 'unknown_right_text', selector: { text: {} } },
              ],
            },
          ],
        },
        {
          type: 'expandable',
          name: '',
          flatten: true,
          title: 'Knob Icons',
          schema: [
            {
              type: 'grid',
              name: '',
              flatten: true,
              schema: [
                { name: 'left_icon', selector: { icon: {} } },
                { name: 'right_icon', selector: { icon: {} } },
                { name: 'unknown_icon', selector: { icon: {} } },
              ],
            },
          ],
        },
        {
          type: 'expandable',
          name: '',
          flatten: true,
          title: 'Slide Right Action (left → right)',
          schema: [
            { name: 'slide_right_service', required: true, selector: { text: {} } },
            { name: 'slide_right_entity', selector: { entity: {} } },
            { name: 'slide_right_data', selector: { text: { multiline: true } } },
          ],
        },
        {
          type: 'expandable',
          name: '',
          flatten: true,
          title: 'Slide Left Action (right → left)',
          schema: [
            { name: 'slide_left_service', required: true, selector: { text: {} } },
            { name: 'slide_left_entity', selector: { entity: {} } },
            { name: 'slide_left_data', selector: { text: { multiline: true } } },
          ],
        },
      ],
      computeLabel: function (schema) {
        var labels = {
          name: 'Name',
          icon: 'Icon',
          target_entity: 'Target Entity',
          layout: 'Layout',
          left_state: 'Left State (e.g. off, locked, closed)',
          right_state: 'Right State (e.g. on, unlocked, open)',
          unknown_state: 'Unknown State Behaviour',
          left_text: 'Left Text (shown when in left state)',
          right_text: 'Right Text (shown when in right state)',
          unknown_left_text: 'Unknown Left Text',
          unknown_right_text: 'Unknown Right Text',
          left_icon: 'Left Icon',
          right_icon: 'Right Icon',
          unknown_icon: 'Unknown Icon',
          slide_right_service: 'Service (e.g. light.turn_on)',
          slide_right_entity: 'Target Entity',
          slide_right_data: 'Service Data (JSON, e.g. {"option": "Heat"})',
          slide_left_service: 'Service (e.g. light.turn_off)',
          slide_left_entity: 'Target Entity',
          slide_left_data: 'Service Data (JSON, e.g. {"option": "Cool"})',
        };
        return labels[schema.name] || schema.name;
      },
    };
  }

  static getStubConfig() {
    return {
      name: 'My Slider',
      icon: 'mdi:door',
      target_entity: '',
      layout: 'vertical',
      left_state: 'off',
      right_state: 'on',
      left_text: 'Slide to turn on',
      right_text: 'Slide to turn off',
      unknown_left_text: '',
      unknown_right_text: '',
      left_icon: 'mdi:lock',
      right_icon: 'mdi:lock-open',
      unknown_icon: 'mdi:help-circle',
      unknown_state: 'disabled',
      slide_right_service: '',
      slide_right_entity: '',
      slide_right_data: '',
      slide_left_service: '',
      slide_left_entity: '',
      slide_left_data: '',
    };
  }

  setConfig(config) {
    if (!config.target_entity) throw new Error('target_entity is required');
    this._config = config;
    this._render();
  }

  _updateFromState(entityState) {
    var st = this._state;
    if (st.dragging) return;
    if (st.snapBackTimeout) { clearTimeout(st.snapBackTimeout); st.snapBackTimeout = null; }
    var c = this._config;
    var tp = 0.5;
    if (entityState === c.left_state) tp = 0;
    else if (entityState === c.right_state) tp = 1;
    this._setKnob(tp, false);
  }

  _setKnob(tp, animate) {
    var st = this._state;
    var knob = this.shadowRoot ? this.shadowRoot.querySelector('#knob') : null;
    var track = this.shadowRoot ? this.shadowRoot.querySelector('#track') : null;
    if (!knob || !track) return;
    var max = track.offsetWidth - KNOB_SIZE - 4;
    var tx = tp * max;
    knob.style.transition = animate ? 'left 0.3s ease-out' : '';
    knob.style.left = tx + 'px';
    if (animate) setTimeout(function () { knob.style.transition = ''; }, 310);
    st.knobPosition = tp;
    st.currentX = tx;
    this._vis();
  }

  _vis() {
    var c = this._config, st = this._state;
    var lt = this.shadowRoot.querySelector('#tl');
    var rt = this.shadowRoot.querySelector('#tr');
    var ic = this.shadowRoot.querySelector('#ki');
    var tk = this.shadowRoot.querySelector('#track');
    var fl = this.shadowRoot.querySelector('#fill');
    var hi = this.shadowRoot.querySelector('#hi');
    if (!lt || !rt || !ic || !tk) return;

    var es = this._es();
    var unk = es !== 'left' && es !== 'right';

    if (unk) {
      lt.textContent = c.unknown_left_text || 'Unknown';
      rt.textContent = c.unknown_right_text || '';
    } else if (es === 'left') {
      lt.textContent = '';
      rt.textContent = c.left_text || 'Slide Right';
    } else {
      lt.textContent = c.right_text || 'Slide Left';
      rt.textContent = '';
    }

    if (unk) ic.setAttribute('icon', c.unknown_icon || 'mdi:help-circle');
    else if (es === 'left') ic.setAttribute('icon', c.left_icon || 'mdi:lock');
    else ic.setAttribute('icon', c.right_icon || 'mdi:lock-open');

    if (unk && c.unknown_state !== 'enabled') tk.classList.add('disabled');
    else tk.classList.remove('disabled');

    if (fl) {
      if (unk) { fl.style.width = '0%'; fl.style.opacity = '0'; }
      else { fl.style.width = (st.knobPosition * 100) + '%'; fl.style.opacity = st.knobPosition > 0.05 ? '1' : '0'; }
    }

    if (hi) {
      if (unk) { hi.setAttribute('icon', c.unknown_icon || c.icon || 'mdi:help-circle'); hi.classList.remove('active'); }
      else if (es === 'left') { hi.setAttribute('icon', c.left_icon || c.icon || 'mdi:lock'); hi.classList.remove('active'); }
      else { hi.setAttribute('icon', c.right_icon || c.icon || 'mdi:lock-open'); hi.classList.add('active'); }
    }
  }

  _es() {
    if (!this._hass) return 'unknown';
    var e = this._hass.states[this._config.target_entity];
    if (!e) return 'unknown';
    return e.state === this._config.left_state ? 'left' : e.state === this._config.right_state ? 'right' : 'unknown';
  }

  _pd(ev) {
    var c = this._config, st = this._state;
    var es = this._es();
    if (es !== 'left' && es !== 'right' && c.unknown_state !== 'enabled') return;
    if (st.snapBackTimeout) { clearTimeout(st.snapBackTimeout); st.snapBackTimeout = null; }
    ev.currentTarget.setPointerCapture(ev.pointerId);
    st.dragging = true;
    st.startX = ev.clientX - st.currentX;
  }

  _pm(ev) {
    var st = this._state;
    if (!st.dragging) return;
    var tk = this.shadowRoot.querySelector('#track');
    var kb = this.shadowRoot.querySelector('#knob');
    if (!tk || !kb) return;
    var max = tk.offsetWidth - KNOB_SIZE - 4;
    var nx = Math.max(0, Math.min(ev.clientX - st.startX, max));
    kb.style.left = nx + 'px';
    st.currentX = nx;
    st.knobPosition = nx / max;
    if (this._es() !== 'unknown') {
      var fl = this.shadowRoot.querySelector('#fill');
      if (fl) { fl.style.width = (st.knobPosition * 100) + '%'; fl.style.opacity = st.knobPosition > 0.05 ? '1' : '0'; }
    }
  }

  _pu() {
    var st = this._state;
    if (!st.dragging) return;
    st.dragging = false;
    var c = this._config;
    var tk = this.shadowRoot.querySelector('#track');
    if (!tk) return;
    var max = tk.offsetWidth - KNOB_SIZE - 4;
    var pos = st.currentX / max;
    var es = this._es(), unk = es === 'unknown', self = this;

    if (es === 'left' || (unk && c.unknown_state === 'enabled')) {
      if (pos >= SLIDE_THRESHOLD) {
        this._exec(c.slide_right_service, c.slide_right_entity, c.slide_right_data);
        this._setKnob(1, true);
        if (unk) st.snapBackTimeout = setTimeout(function () { st.snapBackTimeout = null; self._setKnob(0.5, true); }, UNKNOWN_HOLD_MS);
        return;
      }
    }
    if (es === 'right' || (unk && c.unknown_state === 'enabled')) {
      if (pos <= (1 - SLIDE_THRESHOLD)) {
        this._exec(c.slide_left_service, c.slide_left_entity, c.slide_left_data);
        this._setKnob(0, true);
        if (unk) st.snapBackTimeout = setTimeout(function () { st.snapBackTimeout = null; self._setKnob(0.5, true); }, UNKNOWN_HOLD_MS);
        return;
      }
    }
    this._setKnob(es === 'right' ? 1 : es === 'left' ? 0 : 0.5, true);
  }

  _exec(service, entityId, dataStr) {
    if (!this._hass || !service) return;
    var p = service.split('.');
    if (p.length !== 2) return;
    var target = entityId ? { entity_id: entityId } : {};
    var data = {};
    if (dataStr) {
      try { data = JSON.parse(dataStr); } catch (e) { console.warn('slide-toggle-card: invalid service data JSON:', dataStr); }
    }
    this._hass.callService(p[0], p[1], data, target);
  }

  _render() {
    if (!this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    var root = this.shadowRoot;
    root.innerHTML = '';
    var c = this._config;
    var vert = (c.layout || 'horizontal') === 'vertical';
    var self = this;

    var s = document.createElement('style');
    s.textContent =
      ':host{--bg:var(--primary-background-color,#f5f5f5);--tx:var(--primary-text-color,#333);--kn:var(--primary-color,#03a9f4);--kt:#fff;--db:var(--disabled-text-color,#bdbdbd);--fl:var(--primary-color,#03a9f4)}' +
      '.stc{padding:16px}' +
      '.rh{}' +
      '.hh{display:flex;align-items:center;gap:8px;margin-bottom:8px;color:var(--tx);font-size:14px;font-weight:500}.hh ha-icon{--mdc-icon-size:20px;color:var(--secondary-text-color,#666)}' +
      '.rv{display:flex;flex-direction:column;align-items:center}' +
      '.iv{--mdc-icon-size:24px;color:var(--secondary-text-color,#666);margin-bottom:8px;transition:color 0.3s ease}.iv.active{color:var(--kn)}' +
      '.nv{font-size:14px;font-weight:500;color:var(--tx);margin-bottom:10px;text-align:center}.rv .tk{width:100%}' +
      '.tk{position:relative;height:52px;border-radius:26px;background:var(--bg);overflow:hidden;user-select:none;touch-action:none;border:1px solid rgba(0,0,0,0.08)}' +
      '.tk.disabled{opacity:0.4;pointer-events:none}' +
      '.fl{position:absolute;top:0;left:0;height:100%;background:var(--fl);opacity:0;border-radius:26px;pointer-events:none}' +
      '.tl,.tr{position:absolute;top:0;bottom:0;display:flex;align-items:center;font-size:14px;font-weight:500;color:var(--tx);opacity:0.7;pointer-events:none;z-index:1}' +
      '.tl{left:16px}.tr{right:16px}' +
      '.kb{position:absolute;top:2px;left:0;width:' + KNOB_SIZE + 'px;height:' + KNOB_SIZE + 'px;border-radius:50%;background:var(--kn);display:flex;align-items:center;justify-content:center;cursor:grab;z-index:2;box-shadow:0 2px 8px rgba(0,0,0,0.2)}' +
      '.kb:active{cursor:grabbing;box-shadow:0 4px 12px rgba(0,0,0,0.3)}' +
      '.kb ha-icon{--mdc-icon-size:24px;color:var(--kt);pointer-events:none}' +
      '.tk.disabled .kb{background:var(--db)}';
    root.appendChild(s);

    var card = document.createElement('ha-card');
    var ct = document.createElement('div');
    ct.className = 'stc';
    var rw = document.createElement('div');
    rw.className = vert ? 'rv' : 'rh';

    if (vert) {
      if (c.icon) { var ic = document.createElement('ha-icon'); ic.className = 'iv'; ic.id = 'hi'; ic.setAttribute('icon', c.icon); rw.appendChild(ic); }
      if (c.name) { var nm = document.createElement('div'); nm.className = 'nv'; nm.textContent = c.name; rw.appendChild(nm); }
    } else if (c.name) {
      var hd = document.createElement('div'); hd.className = 'hh';
      if (c.icon) { var hi2 = document.createElement('ha-icon'); hi2.setAttribute('icon', c.icon); hd.appendChild(hi2); }
      var ns = document.createElement('span'); ns.textContent = c.name; hd.appendChild(ns);
      rw.appendChild(hd);
    }

    var tk = document.createElement('div'); tk.className = 'tk'; tk.id = 'track';
    var fl = document.createElement('div'); fl.className = 'fl'; fl.id = 'fill'; tk.appendChild(fl);
    var tl = document.createElement('div'); tl.className = 'tl'; tl.id = 'tl'; tk.appendChild(tl);
    var tr = document.createElement('div'); tr.className = 'tr'; tr.id = 'tr'; tk.appendChild(tr);
    var kb = document.createElement('div'); kb.className = 'kb'; kb.id = 'knob';
    var ki = document.createElement('ha-icon'); ki.id = 'ki'; ki.setAttribute('icon', c.unknown_icon || c.left_icon || 'mdi:help-circle'); kb.appendChild(ki);

    kb.addEventListener('pointerdown', function (e) { self._pd(e); });
    kb.addEventListener('pointermove', function (e) { self._pm(e); });
    kb.addEventListener('pointerup', function () { self._pu(); });
    kb.addEventListener('pointercancel', function () { self._pu(); });

    tk.appendChild(kb); rw.appendChild(tk); ct.appendChild(rw);
    card.appendChild(ct); root.appendChild(card);

    requestAnimationFrame(function () {
      if (self._hass) {
        var e = self._hass.states[c.target_entity];
        self._updateFromState(e ? e.state : undefined);
      }
    });
  }

  getCardSize() { return 2; }
}

// ─── Register ────────────────────────────────────────────────────────────────

if (!customElements.get('slide-toggle-card')) customElements.define('slide-toggle-card', SlideToggleCard);
window.customCards = window.customCards || [];
if (!window.customCards.some(function (c) { return c.type === 'slide-toggle-card'; }))
  window.customCards.push({ type: 'slide-toggle-card', name: 'Slide Toggle Card', description: 'A bidirectional slide-to-confirm toggle card with entity state tracking' });