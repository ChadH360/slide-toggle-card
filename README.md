# Slide Toggle Card

A custom card for [Home Assistant](https://www.home-assistant.io) that provides a **bidirectional slide-to-confirm toggle**. Prevents accidental activation by requiring an intentional sliding action. Tracks entity state so the slider reflects the real-world state of your device.

Inspired by the original [slide-confirm](https://github.com/itsbrianburton/slide-confirm) card by [itsbrianburton](https://github.com/itsbrianburton).

## Features

- **Bidirectional sliding** — slide right to activate, slide left to deactivate
- **Entity state tracking** — the slider position automatically reflects the real state of your entity
- **Unknown state handling** — configurable behaviour when the entity state doesn't match either expected state (useful for devices that don't report position, like some garage shutters)
- **Intent requirement** — must slide 75% of the way to trigger (prevents accidental activation)
- **Two layouts** — horizontal or vertical
- **State-aware icons** — the header icon changes to match the current state and turns blue when active
- **Multiple sliders** — define as many sliders as you need on a single card
- **Visual config editor** — configure everything through the HA GUI with native entity and icon pickers

### Vertical Layout

The vertical layout places the icon on top, the name below it, and the slider at the bottom. The header icon reflects the current state: grey when in the left state, blue when in the right state.

### Horizontal Layout

The horizontal layout places the icon and name side by side as a header, with the slider below.

## Installation

### HACS (Recommended)

1. Open HACS in your Home Assistant instance
2. Click the three dots in the top right → **Custom repositories**
3. Add this repository URL, select **Dashboard** as the category
4. Click **Add**, then find "Slide Toggle Card" and install it
5. Refresh your browser (Ctrl+Shift+R)

### Manual

1. Download `slide-toggle-card.js` from the [latest release](../../releases/latest)
2. Copy it to your Home Assistant `config/www` directory
3. Add the resource: Settings → Dashboards → ⋮ → Resources → Add Resource
   - URL: `/local/slide-toggle-card.js`
   - Type: JavaScript Module
4. Refresh your browser

## Configuration

### Visual Editor

Edit your dashboard, click **Add Card**, search for **Slide Toggle Card** and configure everything through the GUI — entity pickers, icon pickers, and all options are available. No YAML needed.

### YAML Configuration

If you prefer YAML, click "Add Card" → "Manual" and use the examples below.

### Card Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `layout` | string | `horizontal` | `horizontal` or `vertical` |
| `sliders` | list | **Required** | List of slider configurations |

### Slider Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `name` | string | No | — | Label shown above the slider |
| `icon` | string | No | — | MDI icon shown in the header |
| `target_entity` | string | **Yes** | — | Entity ID to track state |
| `left_state` | string | **Yes** | — | Entity state value for left position (e.g. `off`, `locked`, `closed`) |
| `right_state` | string | **Yes** | — | Entity state value for right position (e.g. `on`, `unlocked`, `open`) |
| `left_text` | string | **Yes** | — | Text when entity is in left state |
| `right_text` | string | **Yes** | — | Text when entity is in right state |
| `unknown_left_text` | string | No | `Unknown` | Text shown left of knob when state is unknown |
| `unknown_right_text` | string | No | — | Text shown right of knob when state is unknown |
| `left_icon` | string | No | `mdi:lock` | Knob icon when in left state |
| `right_icon` | string | No | `mdi:lock-open` | Knob icon when in right state |
| `unknown_icon` | string | No | `mdi:help-circle` | Knob icon when state is unknown |
| `slide_right_action` | object | **Yes** | — | Action when sliding left→right |
| `slide_left_action` | object | **Yes** | — | Action when sliding right→left |
| `unknown_state` | string | No | `disabled` | `enabled` or `disabled` |

### Action Object

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `action` | string | Yes | Must be `call-service` |
| `service` | string | Yes | Service to call (e.g. `lock.lock`) |
| `target` | object | No | Target entity/device/area |
| `data` | object | No | Additional service data |

## Examples

### Lock (Vertical Layout)

```yaml
type: custom:slide-toggle-card
layout: vertical
sliders:
  - name: Front Door
    icon: mdi:door
    target_entity: lock.front_door
    left_state: locked
    right_state: unlocked
    left_text: Slide to Unlock
    right_text: Slide to Lock
    unknown_left_text: Lock Unavailable
    unknown_right_text: ""
    left_icon: mdi:lock
    right_icon: mdi:lock-open
    unknown_icon: mdi:help-circle
    slide_right_action:
      action: call-service
      service: lock.unlock
      target:
        entity_id: lock.front_door
    slide_left_action:
      action: call-service
      service: lock.lock
      target:
        entity_id: lock.front_door
    unknown_state: disabled
```

### Light Toggle

```yaml
type: custom:slide-toggle-card
layout: vertical
sliders:
  - name: Kitchen Light
    icon: mdi:lightbulb
    target_entity: light.kitchen
    left_state: "off"
    right_state: "on"
    left_text: Slide to turn on
    right_text: Slide to turn off
    unknown_left_text: "<< Turn Off"
    unknown_right_text: "Turn On >>"
    left_icon: mdi:lightbulb-off
    right_icon: mdi:lightbulb-on
    unknown_icon: mdi:lightbulb-question
    slide_right_action:
      action: call-service
      service: light.turn_on
      target:
        entity_id: light.kitchen
    slide_left_action:
      action: call-service
      service: light.turn_off
      target:
        entity_id: light.kitchen
    unknown_state: disabled
```

### Garage Shutter (Unknown State Enabled)

For devices that don't report position (e.g. Somfy shutters), set `unknown_state: enabled`. The knob starts in the middle and can be slid in either direction. After the action fires, the knob holds at the end briefly then slides back to the middle.

```yaml
type: custom:slide-toggle-card
layout: vertical
sliders:
  - name: Garage Shutter
    icon: mdi:garage-variant
    target_entity: cover.garage_shutter
    left_state: closed
    right_state: open
    left_text: Slide to Open
    right_text: Slide to Close
    unknown_left_text: "<< Close"
    unknown_right_text: "Open >>"
    left_icon: mdi:garage
    right_icon: mdi:garage-open
    unknown_icon: mdi:garage-alert
    slide_right_action:
      action: call-service
      service: cover.open_cover
      target:
        entity_id: cover.garage_shutter
    slide_left_action:
      action: call-service
      service: cover.close_cover
      target:
        entity_id: cover.garage_shutter
    unknown_state: enabled
```

### Multiple Sliders (Horizontal Layout)

```yaml
type: custom:slide-toggle-card
layout: horizontal
sliders:
  - name: Front Door
    icon: mdi:door
    target_entity: lock.front_door
    left_state: locked
    right_state: unlocked
    left_text: Slide to Unlock
    right_text: Slide to Lock
    left_icon: mdi:lock
    right_icon: mdi:lock-open
    slide_right_action:
      action: call-service
      service: lock.unlock
      target:
        entity_id: lock.front_door
    slide_left_action:
      action: call-service
      service: lock.lock
      target:
        entity_id: lock.front_door

  - name: Back Door
    icon: mdi:door-sliding
    target_entity: lock.back_door
    left_state: locked
    right_state: unlocked
    left_text: Slide to Unlock
    right_text: Slide to Lock
    left_icon: mdi:lock
    right_icon: mdi:lock-open
    slide_right_action:
      action: call-service
      service: lock.unlock
      target:
        entity_id: lock.back_door
    slide_left_action:
      action: call-service
      service: lock.lock
      target:
        entity_id: lock.back_door
```

## How It Works

1. **Entity state determines slider position** — when HA reports the entity state, the knob animates to the correct side (left for `left_state`, right for `right_state`, middle for anything else).

2. **Sliding triggers actions** — slide the knob 75% of the way across to trigger the corresponding action. If you don't slide far enough, it snaps back.

3. **Unknown states** — if the entity reports a state that doesn't match `left_state` or `right_state`, the knob sits in the middle. With `unknown_state: disabled`, the slider is greyed out. With `unknown_state: enabled`, you can still slide in either direction — the knob will hold at the end for a moment then slide back to the middle.

4. **Visual feedback** — a fill bar follows the knob in known states (hidden in unknown state). The header icon in vertical layout changes to match the current state icon and turns blue when in the right state.

## License

MIT
