/**
 * Slide Toggle Card for Home Assistant
 *
 * Inspired by the original slide-confirm card by itsbrianburton
 * (https://github.com/itsbrianburton/slide-confirm)
 */

var SLIDE_TOGGLE_VERSION = '3.0.0';
console.info('%c SLIDE-TOGGLE-CARD %c v' + SLIDE_TOGGLE_VERSION + ' ', 'color:#fff;background:#03a9f4;font-weight:bold;', 'color:#03a9f4;background:#fff;font-weight:bold;');

var KNOB_SIZE = 48;
var SLIDE_THRESHOLD = 0.75;
var UNKNOWN_HOLD_MS = 1000;

// ─── Main Card ───────────────────────────────────────────────────────────────

class SlideToggleCard extends HTMLElement {

  constructor() {
    super();
    this._sliderStates = new Map();
    this._config = null;
    this._hass = null;
  }

  set hass(hass) {
    var oldHass = this._hass;
    this._hass = hass;
    if (!this._config) return;
    var self = this;
    this._config.sliders.forEach(function (slider, index) {
      var state = hass.states[slider.target_entity];
      var oldState = oldHass && oldHass.states ? oldHass.states[slider.target_entity] : undefined;
      var nv = state ? state.state : undefined;
      var ov = oldState ? oldState.state : undefined;
      if (nv !== ov) self._updateSliderFromState(index, slider, nv);
    });
    if (!this.shadowRoot || !this.shadowRoot.querySelector('.card-container')) this._render();
  }

  static getConfigElement() { return document.createElement('slide-toggle-card-editor'); }

  static getStubConfig() {
    return {
      layout: 'horizontal',
      sliders: [{
        name: 'Front Door', icon: 'mdi:door', target_entity: '',
        left_state: 'locked', right_state: 'unlocked',
        left_text: 'Slide to Unlock', right_text: 'Slide to Lock',
        unknown_left_text: 'Unavailable', unknown_right_text: '',
        left_icon: 'mdi:lock', right_icon: 'mdi:lock-open', unknown_icon: 'mdi:help-circle',
        slide_right_action: { action: 'call-service', service: '', target: {} },
        slide_left_action: { action: 'call-service', service: '', target: {} },
        unknown_state: 'disabled',
      }],
    };
  }

  setConfig(config) {
    if (!config.sliders || !Array.isArray(config.sliders)) throw new Error('Please define at least one slider');
    this._config = config;
    var self = this;
    config.sliders.forEach(function (_, i) {
      if (!self._sliderStates.has(i)) {
        self._sliderStates.set(i, { dragging: false, startX: 0, currentX: 0, knobPosition: 0.5, targetPosition: 0.5, snapBackTimeout: null });
      }
    });
    this._render();
  }

  _updateSliderFromState(index, slider, entityState) {
    var state = this._sliderStates.get(index);
    if (!state || state.dragging) return;
    if (state.snapBackTimeout) { clearTimeout(state.snapBackTimeout); state.snapBackTimeout = null; }
    var tp = 0.5;
    if (entityState === slider.left_state) tp = 0;
    else if (entityState === slider.right_state) tp = 1;
    state.targetPosition = tp;
    this._animateKnob(index, tp);
  }

  _animateKnob(index, tp) {
    var state = this._sliderStates.get(index);
    if (!state) return;
    var knob = this.shadowRoot ? this.shadowRoot.querySelector('#knob-' + index) : null;
    var track = this.shadowRoot ? this.shadowRoot.querySelector('#track-' + index) : null;
    if (!knob || !track) return;
    var maxTravel = track.offsetWidth - KNOB_SIZE - 4;
    var targetX = tp * maxTravel;
    knob.style.transition = 'left 0.3s ease-out';
    knob.style.left = targetX + 'px';
    state.knobPosition = tp;
    state.currentX = targetX;
    this._updateSliderVisuals(index);
    setTimeout(function () { knob.style.transition = ''; }, 300);
  }

  _updateSliderVisuals(index) {
    var slider = this._config.sliders[index];
    var state = this._sliderStates.get(index);
    if (!state) return;
    var ltEl = this.shadowRoot ? this.shadowRoot.querySelector('#text-left-' + index) : null;
    var rtEl = this.shadowRoot ? this.shadowRoot.querySelector('#text-right-' + index) : null;
    var iconEl = this.shadowRoot ? this.shadowRoot.querySelector('#knob-icon-' + index) : null;
    var trackEl = this.shadowRoot ? this.shadowRoot.querySelector('#track-' + index) : null;
    var fillEl = this.shadowRoot ? this.shadowRoot.querySelector('#fill-' + index) : null;
    if (!ltEl || !rtEl || !iconEl || !trackEl) return;

    var es = this._getEntityState(slider);
    var isUnk = es !== 'left' && es !== 'right';
    var isDis = isUnk && slider.unknown_state !== 'enabled';

    if (isUnk) {
      ltEl.textContent = slider.unknown_left_text || slider.unknown_text || 'Unknown';
      rtEl.textContent = slider.unknown_right_text || '';
    } else if (es === 'left') {
      ltEl.textContent = '';
      rtEl.textContent = slider.left_text || 'Slide Right';
    } else {
      ltEl.textContent = slider.right_text || 'Slide Left';
      rtEl.textContent = '';
    }

    if (isUnk) iconEl.setAttribute('icon', slider.unknown_icon || 'mdi:help-circle');
    else if (es === 'left') iconEl.setAttribute('icon', slider.left_icon || 'mdi:lock');
    else iconEl.setAttribute('icon', slider.right_icon || 'mdi:lock-open');

    // Update header icon (vertical layout) — match state icon and colour
    var headerIcon = this.shadowRoot ? this.shadowRoot.querySelector('#header-icon-' + index) : null;
    if (headerIcon) {
      if (isUnk) {
        headerIcon.setAttribute('icon', slider.unknown_icon || slider.icon || 'mdi:help-circle');
        headerIcon.classList.remove('state-right');
      } else if (es === 'left') {
        headerIcon.setAttribute('icon', slider.left_icon || slider.icon || 'mdi:lock');
        headerIcon.classList.remove('state-right');
      } else {
        headerIcon.setAttribute('icon', slider.right_icon || slider.icon || 'mdi:lock-open');
        headerIcon.classList.add('state-right');
      }
    }

    if (isDis) trackEl.classList.add('disabled'); else trackEl.classList.remove('disabled');

    if (fillEl) {
      if (isUnk) { fillEl.style.width = '0%'; fillEl.style.opacity = '0'; }
      else { fillEl.style.width = (state.knobPosition * 100) + '%'; fillEl.style.opacity = state.knobPosition > 0.05 ? '1' : '0'; }
    }
  }

  _getEntityState(slider) {
    if (!this._hass) return 'unknown';
    var e = this._hass.states[slider.target_entity];
    if (!e) return 'unknown';
    if (e.state === slider.left_state) return 'left';
    if (e.state === slider.right_state) return 'right';
    return 'unknown';
  }

  _handlePointerDown(index, event) {
    var slider = this._config.sliders[index];
    var state = this._sliderStates.get(index);
    if (!state) return;
    var es = this._getEntityState(slider);
    if (es !== 'left' && es !== 'right' && slider.unknown_state !== 'enabled') return;
    if (state.snapBackTimeout) { clearTimeout(state.snapBackTimeout); state.snapBackTimeout = null; }
    event.currentTarget.setPointerCapture(event.pointerId);
    state.dragging = true;
    state.startX = event.clientX - state.currentX;
  }

  _handlePointerMove(index, event) {
    var state = this._sliderStates.get(index);
    if (!state || !state.dragging) return;
    var track = this.shadowRoot.querySelector('#track-' + index);
    var knob = this.shadowRoot.querySelector('#knob-' + index);
    if (!track || !knob) return;
    var maxTravel = track.offsetWidth - KNOB_SIZE - 4;
    var newX = Math.max(0, Math.min(event.clientX - state.startX, maxTravel));
    knob.style.left = newX + 'px';
    state.currentX = newX;
    state.knobPosition = newX / maxTravel;
    var slider = this._config.sliders[index];
    if (this._getEntityState(slider) !== 'unknown') {
      var fillEl = this.shadowRoot.querySelector('#fill-' + index);
      if (fillEl) { fillEl.style.width = (state.knobPosition * 100) + '%'; fillEl.style.opacity = state.knobPosition > 0.05 ? '1' : '0'; }
    }
  }

  _handlePointerUp(index) {
    var state = this._sliderStates.get(index);
    if (!state || !state.dragging) return;
    state.dragging = false;
    var slider = this._config.sliders[index];
    var track = this.shadowRoot.querySelector('#track-' + index);
    if (!track) return;
    var maxTravel = track.offsetWidth - KNOB_SIZE - 4;
    var pos = state.currentX / maxTravel;
    var es = this._getEntityState(slider);
    var isUnk = es === 'unknown';
    var self = this;
    if (es === 'left' || (isUnk && slider.unknown_state === 'enabled')) {
      if (pos >= SLIDE_THRESHOLD) {
        this._executeAction(slider.slide_right_action);
        this._animateKnob(index, 1);
        if (isUnk) { state.snapBackTimeout = setTimeout(function () { state.snapBackTimeout = null; self._animateKnob(index, 0.5); }, UNKNOWN_HOLD_MS); }
        return;
      }
    }
    if (es === 'right' || (isUnk && slider.unknown_state === 'enabled')) {
      if (pos <= (1 - SLIDE_THRESHOLD)) {
        this._executeAction(slider.slide_left_action);
        this._animateKnob(index, 0);
        if (isUnk) { state.snapBackTimeout = setTimeout(function () { state.snapBackTimeout = null; self._animateKnob(index, 0.5); }, UNKNOWN_HOLD_MS); }
        return;
      }
    }
    this._animateKnob(index, es === 'right' ? 1 : es === 'left' ? 0 : 0.5);
  }

  _executeAction(ac) {
    if (!this._hass || !ac) return;
    if (ac.action === 'call-service' && ac.service) {
      var p = ac.service.split('.');
      this._hass.callService(p[0], p[1], ac.data || {}, ac.target || {});
    }
  }

  _render() {
    if (!this._config) return;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    var root = this.shadowRoot;
    root.innerHTML = '';
    var layout = this._config.layout || 'horizontal';
    var isVert = layout === 'vertical';

    var style = document.createElement('style');
    style.textContent =
      ':host{--slider-bg:var(--primary-background-color,#f5f5f5);--slider-text:var(--primary-text-color,#333);' +
      '--slider-knob:var(--primary-color,#03a9f4);--slider-knob-text:#fff;--slider-disabled-bg:var(--disabled-text-color,#bdbdbd);' +
      '--slider-fill:var(--primary-color,#03a9f4)}' +
      '.card-container{padding:16px}' +
      '.slider-row-h{margin-bottom:16px}.slider-row-h:last-child{margin-bottom:0}' +
      '.slider-header-h{display:flex;align-items:center;gap:8px;margin-bottom:8px;color:var(--slider-text);font-size:14px;font-weight:500}' +
      '.slider-header-h ha-icon{--mdc-icon-size:20px;color:var(--secondary-text-color,#666)}' +
      '.slider-row-v{display:flex;flex-direction:column;align-items:center;margin-bottom:16px}.slider-row-v:last-child{margin-bottom:0}' +
      '.slider-icon-v{--mdc-icon-size:24px;color:var(--secondary-text-color,#666);margin-bottom:8px;transition:color 0.3s ease}' +
      '.slider-icon-v.state-right{color:var(--primary-color,#03a9f4)}' +
      '.slider-name-v{font-size:14px;font-weight:500;color:var(--slider-text);margin-bottom:10px;text-align:center}' +
      '.slider-row-v .slider-track{width:100%}' +
      '.slider-track{position:relative;height:52px;border-radius:26px;background:var(--slider-bg);overflow:hidden;user-select:none;touch-action:none;border:1px solid rgba(0,0,0,0.08)}' +
      '.slider-track.disabled{opacity:0.4;pointer-events:none}' +
      '.slider-fill{position:absolute;top:0;left:0;height:100%;background:var(--slider-fill);opacity:0;border-radius:26px;transition:opacity 0.15s ease;pointer-events:none}' +
      '.slider-text-left,.slider-text-right{position:absolute;top:0;bottom:0;display:flex;align-items:center;font-size:14px;font-weight:500;color:var(--slider-text);opacity:0.7;pointer-events:none;z-index:1}' +
      '.slider-text-left{left:16px;justify-content:flex-start}' +
      '.slider-text-right{right:16px;justify-content:flex-end}' +
      '.slider-knob{position:absolute;top:2px;left:0;width:' + KNOB_SIZE + 'px;height:' + KNOB_SIZE + 'px;border-radius:50%;background:var(--slider-knob);display:flex;align-items:center;justify-content:center;cursor:grab;z-index:2;box-shadow:0 2px 8px rgba(0,0,0,0.2)}' +
      '.slider-knob:active{cursor:grabbing;box-shadow:0 4px 12px rgba(0,0,0,0.3)}' +
      '.slider-knob ha-icon{--mdc-icon-size:24px;color:var(--slider-knob-text);pointer-events:none}' +
      '.slider-track.disabled .slider-knob{background:var(--slider-disabled-bg)}';
    root.appendChild(style);

    var card = document.createElement('ha-card');
    var container = document.createElement('div');
    container.className = 'card-container';
    var self = this;

    this._config.sliders.forEach(function (slider, index) {
      var row = document.createElement('div');
      row.className = isVert ? 'slider-row-v' : 'slider-row-h';

      if (isVert) {
        if (slider.icon) { var ic = document.createElement('ha-icon'); ic.className = 'slider-icon-v'; ic.id = 'header-icon-' + index; ic.setAttribute('icon', slider.icon); row.appendChild(ic); }
        if (slider.name) { var nm = document.createElement('div'); nm.className = 'slider-name-v'; nm.textContent = slider.name; row.appendChild(nm); }
      } else {
        if (slider.name) {
          var hd = document.createElement('div'); hd.className = 'slider-header-h';
          if (slider.icon) { var hi = document.createElement('ha-icon'); hi.setAttribute('icon', slider.icon); hd.appendChild(hi); }
          var ns = document.createElement('span'); ns.textContent = slider.name; hd.appendChild(ns);
          row.appendChild(hd);
        }
      }

      var track = document.createElement('div'); track.className = 'slider-track'; track.id = 'track-' + index;
      var fill = document.createElement('div'); fill.className = 'slider-fill'; fill.id = 'fill-' + index; track.appendChild(fill);
      var tl = document.createElement('div'); tl.className = 'slider-text-left'; tl.id = 'text-left-' + index; track.appendChild(tl);
      var tr2 = document.createElement('div'); tr2.className = 'slider-text-right'; tr2.id = 'text-right-' + index; track.appendChild(tr2);
      var knob = document.createElement('div'); knob.className = 'slider-knob'; knob.id = 'knob-' + index;
      var ki = document.createElement('ha-icon'); ki.id = 'knob-icon-' + index; ki.setAttribute('icon', slider.unknown_icon || slider.left_icon || 'mdi:help-circle'); knob.appendChild(ki);

      knob.addEventListener('pointerdown', function (e) { self._handlePointerDown(index, e); });
      knob.addEventListener('pointermove', function (e) { self._handlePointerMove(index, e); });
      knob.addEventListener('pointerup', function () { self._handlePointerUp(index); });
      knob.addEventListener('pointercancel', function () { self._handlePointerUp(index); });

      track.appendChild(knob); row.appendChild(track); container.appendChild(row);
    });

    card.appendChild(container); root.appendChild(card);

    requestAnimationFrame(function () {
      self._config.sliders.forEach(function (slider, index) {
        if (self._hass) {
          var e = self._hass.states[slider.target_entity];
          self._updateSliderFromState(index, slider, e ? e.state : undefined);
        }
      });
    });
  }

  getCardSize() { return this._config ? this._config.sliders.length : 1; }
}

// ─── GUI Config Editor ───────────────────────────────────────────────────────

class SlideToggleCardEditor extends HTMLElement {

  constructor() {
    super();
    this._config = null;
    this._hass = null;
  }

  set hass(hass) {
    this._hass = hass;
    if (this.shadowRoot) {
      this.shadowRoot.querySelectorAll('ha-entity-picker').forEach(function (el) { el.hass = hass; });
      this.shadowRoot.querySelectorAll('ha-icon-picker').forEach(function (el) { el.hass = hass; });
    }
  }

  setConfig(config) {
    // Don't re-render if the config matches what we already have (our own change echoed back)
    if (this._config && JSON.stringify(config) === JSON.stringify(this._config)) {
      return;
    }
    this._config = JSON.parse(JSON.stringify(config));
    this._render();
  }

  _fire() {
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    var root = this.shadowRoot;
    root.innerHTML = '';

    var style = document.createElement('style');
    style.textContent =
      ':host{display:block}.editor{padding:8px 0}' +
      '.section{border:1px solid var(--divider-color,#e0e0e0);border-radius:8px;padding:16px;margin-bottom:16px;background:var(--card-background-color,#fff)}' +
      '.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}' +
      '.section-title{font-weight:600;font-size:16px;color:var(--primary-text-color)}' +
      '.remove-btn{color:var(--error-color,#db4437);cursor:pointer;background:none;border:none;font-size:13px;padding:4px 8px;border-radius:4px}' +
      '.remove-btn:hover{background:rgba(219,68,55,0.1)}' +
      '.gtitle{font-weight:500;font-size:12px;color:var(--secondary-text-color,#666);margin:12px 0 8px;text-transform:uppercase;letter-spacing:0.5px}' +
      '.r{display:grid;gap:8px;margin-bottom:8px}.c1{grid-template-columns:1fr}.c2{grid-template-columns:1fr 1fr}.c3{grid-template-columns:1fr 1fr 1fr}' +
      '.f{min-width:0}.f ha-textfield,.f ha-entity-picker,.f ha-icon-picker{display:block;width:100%}' +
      'ha-textfield{--mdc-text-field-fill-color:transparent}' +
      'label{display:block;font-size:12px;color:var(--secondary-text-color);margin-bottom:4px}' +
      'select{width:100%;padding:8px;border:1px solid var(--divider-color,#e0e0e0);border-radius:4px;font-size:14px;background:var(--primary-background-color,#fafafa);color:var(--primary-text-color);box-sizing:border-box}' +
      '.add-btn{width:100%;padding:10px;border:2px dashed var(--divider-color,#e0e0e0);border-radius:8px;background:none;color:var(--primary-color,#03a9f4);font-size:14px;font-weight:500;cursor:pointer}' +
      '.add-btn:hover{background:rgba(3,169,244,0.05);border-color:var(--primary-color)}';
    root.appendChild(style);

    var editor = document.createElement('div');
    editor.className = 'editor';
    var self = this;

    // Card-level layout
    var ls = document.createElement('div'); ls.className = 'section';
    ls.appendChild(this._gt('Card Settings'));
    var lr = this._r('c1');
    lr.appendChild(this._sel('Layout', this._config.layout || 'horizontal', [
      { value: 'horizontal', label: 'Horizontal' },
      { value: 'vertical', label: 'Vertical' },
    ], function (v) { self._config.layout = v; self._fire(); }));
    ls.appendChild(lr);
    editor.appendChild(ls);

    // Sliders
    var sliders = this._config.sliders || [];
    sliders.forEach(function (slider, index) {
      var sec = document.createElement('div'); sec.className = 'section';

      var hdr = document.createElement('div'); hdr.className = 'section-header';
      var title = document.createElement('span'); title.className = 'section-title';
      title.textContent = slider.name || ('Slider ' + (index + 1));
      hdr.appendChild(title);

      if (sliders.length > 1) {
        var rb = document.createElement('button'); rb.className = 'remove-btn'; rb.textContent = 'Remove';
        rb.addEventListener('click', function () { self._config.sliders.splice(index, 1); self._fire(); self._render(); });
        hdr.appendChild(rb);
      }
      sec.appendChild(hdr);

      // General
      sec.appendChild(self._gt('General'));
      var g1 = self._r('c2');
      g1.appendChild(self._tf('Name', slider.name || '', function (v) { self._config.sliders[index].name = v; title.textContent = v || ('Slider ' + (index + 1)); }));
      g1.appendChild(self._ip('Header Icon', slider.icon || '', function (v) { self._config.sliders[index].icon = v; }));
      sec.appendChild(g1);

      var g1b = self._r('c1');
      g1b.appendChild(self._ep('Target Entity', slider.target_entity || '', function (v) { self._config.sliders[index].target_entity = v; }));
      sec.appendChild(g1b);

      // States
      sec.appendChild(self._gt('Entity States'));
      var g2 = self._r('c3');
      g2.appendChild(self._tf('Left State', slider.left_state || '', function (v) { self._config.sliders[index].left_state = v; }));
      g2.appendChild(self._tf('Right State', slider.right_state || '', function (v) { self._config.sliders[index].right_state = v; }));
      g2.appendChild(self._sel('Unknown State', slider.unknown_state || 'disabled', [
        { value: 'disabled', label: 'Disabled' }, { value: 'enabled', label: 'Enabled' },
      ], function (v) { self._config.sliders[index].unknown_state = v; self._fire(); }));
      sec.appendChild(g2);

      // Text
      sec.appendChild(self._gt('Slider Text'));
      var g3 = self._r('c2');
      g3.appendChild(self._tf('Left Text', slider.left_text || '', function (v) { self._config.sliders[index].left_text = v; }));
      g3.appendChild(self._tf('Right Text', slider.right_text || '', function (v) { self._config.sliders[index].right_text = v; }));
      sec.appendChild(g3);
      var g3b = self._r('c2');
      g3b.appendChild(self._tf('Unknown Left Text', slider.unknown_left_text || slider.unknown_text || '', function (v) { self._config.sliders[index].unknown_left_text = v; }));
      g3b.appendChild(self._tf('Unknown Right Text', slider.unknown_right_text || '', function (v) { self._config.sliders[index].unknown_right_text = v; }));
      sec.appendChild(g3b);

      // Icons
      sec.appendChild(self._gt('Knob Icons'));
      var g4 = self._r('c3');
      g4.appendChild(self._ip('Left Icon', slider.left_icon || '', function (v) { self._config.sliders[index].left_icon = v; }));
      g4.appendChild(self._ip('Right Icon', slider.right_icon || '', function (v) { self._config.sliders[index].right_icon = v; }));
      g4.appendChild(self._ip('Unknown Icon', slider.unknown_icon || '', function (v) { self._config.sliders[index].unknown_icon = v; }));
      sec.appendChild(g4);

      // Actions
      sec.appendChild(self._gt('Slide Right Action (left \u2192 right)'));
      sec.appendChild(self._af(slider.slide_right_action, function (a) { self._config.sliders[index].slide_right_action = a; }));
      sec.appendChild(self._gt('Slide Left Action (right \u2192 left)'));
      sec.appendChild(self._af(slider.slide_left_action, function (a) { self._config.sliders[index].slide_left_action = a; }));

      editor.appendChild(sec);
    });

    var addBtn = document.createElement('button'); addBtn.className = 'add-btn'; addBtn.textContent = '+ Add Slider';
    addBtn.addEventListener('click', function () {
      if (!self._config.sliders) self._config.sliders = [];
      self._config.sliders.push({
        name: '', icon: '', target_entity: '', left_state: '', right_state: '',
        left_text: '', right_text: '', unknown_left_text: '', unknown_right_text: '',
        left_icon: 'mdi:lock', right_icon: 'mdi:lock-open', unknown_icon: 'mdi:help-circle',
        slide_right_action: { action: 'call-service', service: '', target: {} },
        slide_left_action: { action: 'call-service', service: '', target: {} },
        unknown_state: 'disabled',
      });
      self._fire(); self._render();
    });
    editor.appendChild(addBtn);
    root.appendChild(editor);

    // Wait for HA custom elements to be defined, then set hass
    this._waitAndSetHass();
  }

  _waitAndSetHass() {
    var h = this._hass;
    if (!h || !this.shadowRoot) return;
    var root = this.shadowRoot;

    // Wait for ha-entity-picker to be defined, then set hass on all instances
    var setHassOnAll = function () {
      root.querySelectorAll('ha-entity-picker').forEach(function (el) { el.hass = h; });
      root.querySelectorAll('ha-icon-picker').forEach(function (el) { el.hass = h; });
    };

    // Try immediately
    setHassOnAll();

    // Also wait for the elements to be defined (in case they haven't loaded yet)
    if (customElements.get('ha-entity-picker')) {
      // Already defined, just need a frame for rendering
      requestAnimationFrame(setHassOnAll);
    } else {
      customElements.whenDefined('ha-entity-picker').then(function () {
        setHassOnAll();
      });
    }
  }

  _gt(t) { var e = document.createElement('div'); e.className = 'gtitle'; e.textContent = t; return e; }
  _r(c) { var e = document.createElement('div'); e.className = 'r ' + c; return e; }

  _tf(label, val, onChange) {
    var w = document.createElement('div'); w.className = 'f';
    var tf = document.createElement('ha-textfield');
    tf.setAttribute('label', label);
    tf.setAttribute('value', val);
    var self = this;
    // Only fire on change (blur/enter), NOT on input — prevents focus loss
    tf.addEventListener('change', function (e) {
      onChange(e.target.value);
      self._fire();
    });
    w.appendChild(tf);
    return w;
  }

  _ep(label, val, onChange) {
    var w = document.createElement('div'); w.className = 'f';
    var p = document.createElement('ha-entity-picker');
    p.setAttribute('label', label);
    p.setAttribute('allow-custom-entity', '');
    p.value = val;
    if (this._hass) p.hass = this._hass;
    var self = this;
    p.addEventListener('value-changed', function (ev) {
      onChange(ev.detail.value || '');
      self._fire();
    });
    w.appendChild(p);
    return w;
  }

  _ip(label, val, onChange) {
    var w = document.createElement('div'); w.className = 'f';
    var p = document.createElement('ha-icon-picker');
    p.setAttribute('label', label);
    p.value = val;
    if (this._hass) p.hass = this._hass;
    var self = this;
    p.addEventListener('value-changed', function (ev) {
      onChange(ev.detail.value || '');
      self._fire();
    });
    w.appendChild(p);
    return w;
  }

  _sel(label, val, opts, onChange) {
    var w = document.createElement('div'); w.className = 'f';
    var l = document.createElement('label'); l.textContent = label; w.appendChild(l);
    var s = document.createElement('select');
    opts.forEach(function (o) { var op = document.createElement('option'); op.value = o.value; op.textContent = o.label; if (o.value === val) op.selected = true; s.appendChild(op); });
    s.addEventListener('change', function (e) { onChange(e.target.value); });
    w.appendChild(s);
    return w;
  }

  _af(action, onChange) {
    var c = action || { action: 'call-service', service: '', target: {} };
    var d = document.createElement('div');
    var r = this._r('c2');
    r.appendChild(this._tf('Service (e.g. lock.lock)', c.service || '', function (v) { c.service = v; c.action = 'call-service'; onChange(c); }));
    r.appendChild(this._ep('Target Entity', (c.target && c.target.entity_id) || '', function (v) { if (!c.target) c.target = {}; c.target.entity_id = v; c.action = 'call-service'; onChange(c); }));
    d.appendChild(r);
    return d;
  }
}

// ─── Register ────────────────────────────────────────────────────────────────

if (!customElements.get('slide-toggle-card')) customElements.define('slide-toggle-card', SlideToggleCard);
if (!customElements.get('slide-toggle-card-editor')) customElements.define('slide-toggle-card-editor', SlideToggleCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some(function (c) { return c.type === 'slide-toggle-card'; })) {
  window.customCards.push({ type: 'slide-toggle-card', name: 'Slide Toggle Card', description: 'A bidirectional slide-to-confirm toggle card with entity state tracking' });
}
