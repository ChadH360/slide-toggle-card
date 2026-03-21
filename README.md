# Slide Toggle Card

A custom card for [Home Assistant](https://www.home-assistant.io) that provides a **bidirectional slide-to-confirm toggle**. Prevents accidental activation by requiring an intentional sliding action. Tracks entity state so the slider reflects the real-world state of your device.

Inspired by the original [slide-confirm](https://github.com/itsbrianburton/slide-confirm) card by [itsbrianburton](https://github.com/itsbrianburton).

## Features

- **Bidirectional sliding** — slide right to activate, slide left to deactivate
- **Entity state tracking** — the slider position automatically reflects the real state of your entity
- **Unknown state handling** — configurable behaviour when the entity state doesn't match either expected state (useful for devices that don't report position, like some garage shutters)
- **Intent requirement** — must slide 75% of the way to trigger (prevents accidental activation)
- **Two layouts** — horizontal (name + slider stacked) or vertical (icon, name, slider)
- **State-aware icons** — the header icon changes to match the current state and turns blue when active
- **Native visual editor** — configure everything through the HA GUI with entity pickers, icon pickers, and all options

## Installation

### HACS (Recommended)

1. Open HACS in your Home Assistant instance
2. Click the three dots in the top right → **Custom repositories**
3. Add this repository URL, select **Dashboard** as the category
4. Click **Add**, then find "Slide Toggle Card" and install it
5. Refresh your browser

### Manual

1. Download `slide-toggle-card.js` from the [latest release](../../releases/latest)
2. Copy it to your Home Assistant `config/www` directory
3. Add the resource: Settings → Dashboards → ⋮ → Resources → Add Resource
   - URL: `/local/slide-toggle-card.js`
   - Type: JavaScript Module
4. Refresh your browser

## Configuration

### Visual Editor

Edit your dashboard, click **Add Card**, search for **Slide Toggle Card** and configure everything through the GUI. All fields have native HA pickers — no YAML needed.

### YAML Configuration

If you prefer YAML, click "Add Card" → "Manual":

```yaml
type: custom:slide-toggle-card
name: Kitchen Light
icon: mdi:lightbulb
target_entity: light.kitchen
layout: vertical
left_state: "off"
right_state: "on"
left_text: Slide to turn on
right_text: Slide to turn off
unknown_left_text: "<< Turn Off"
unknown_right_text: "Turn On >>"
left_icon: mdi:lightbulb-off
right_icon: mdi:lightbulb-on
unknown_icon: mdi:lightbulb-question
unknown_state: disabled
slide_right_service: light.turn_on
slide_right_entity: light.kitchen
slide_left_service: light.turn_off
slide_left_entity: light.kitchen
```

### Configuration Reference

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `name` | string | No | — | Label shown above the slider |
| `icon` | string | No | — | MDI icon shown in the header |
| `target_entity` | string | **Yes** | — | Entity ID to track state |
| `layout` | string | No | `horizontal` | `horizontal` or `vertical` |
| `left_state` | string | **Yes** | — | Entity state for left position (e.g. `off`, `locked`, `closed`) |
| `right_state` | string | **Yes** | — | Entity state for right position (e.g. `on`, `unlocked`, `open`) |
| `left_text` | string | **Yes** | — | Text when entity is in left state |
| `right_text` | string | **Yes** | — | Text when entity is in right state |
| `unknown_left_text` | string | No | `Unknown` | Text shown left of knob when state is unknown |
| `unknown_right_text` | string | No | — | Text shown right of knob when state is unknown |
| `left_icon` | string | No | `mdi:lock` | Knob icon when in left state |
| `right_icon` | string | No | `mdi:lock-open` | Knob icon when in right state |
| `unknown_icon` | string | No | `mdi:help-circle` | Knob icon when state is unknown |
| `unknown_state` | string | No | `disabled` | `enabled` or `disabled` |
| `slide_right_service` | string | **Yes** | — | Service to call when sliding right (e.g. `light.turn_on`) |
| `slide_right_entity` | string | No | — | Target entity for the right slide action |
| `slide_left_service` | string | **Yes** | — | Service to call when sliding left (e.g. `light.turn_off`) |
| `slide_left_entity` | string | No | — | Target entity for the left slide action |

## Examples

### Lock

```yaml
type: custom:slide-toggle-card
name: Front Door
icon: mdi:door
target_entity: lock.front_door
layout: vertical
left_state: locked
right_state: unlocked
left_text: Slide to Unlock
right_text: Slide to Lock
unknown_left_text: Lock Unavailable
left_icon: mdi:lock
right_icon: mdi:lock-open
unknown_icon: mdi:help-circle
unknown_state: disabled
slide_right_service: lock.unlock
slide_right_entity: lock.front_door
slide_left_service: lock.lock
slide_left_entity: lock.front_door
```

### Garage Shutter (Unknown State Enabled)

For devices that don't report position (e.g. Somfy shutters), set `unknown_state: enabled`. The knob starts in the middle and can be slid in either direction. After the action fires, the knob holds at the end briefly then slides back to the middle.

```yaml
type: custom:slide-toggle-card
name: Garage Shutter
icon: mdi:garage-variant
target_entity: cover.garage_shutter
layout: vertical
left_state: closed
right_state: open
left_text: Slide to Open
right_text: Slide to Close
unknown_left_text: "<< Close"
unknown_right_text: "Open >>"
left_icon: mdi:garage
right_icon: mdi:garage-open
unknown_icon: mdi:garage-alert
unknown_state: enabled
slide_right_service: cover.open_cover
slide_right_entity: cover.garage_shutter
slide_left_service: cover.close_cover
slide_left_entity: cover.garage_shutter
```

### Multiple Sliders

Want multiple sliders? Add multiple cards — HA's grid and stack layouts handle this natively.

## How It Works

1. **Entity state determines slider position** — when HA reports the entity state, the knob moves to the correct side (left for `left_state`, right for `right_state`, middle for anything else).

2. **Sliding triggers actions** — slide the knob 75% of the way across to trigger the corresponding service call. If you don't slide far enough, it snaps back.

3. **Unknown states** — if the entity reports a state that doesn't match `left_state` or `right_state`, the knob sits in the middle. With `unknown_state: disabled`, the slider is greyed out. With `unknown_state: enabled`, you can still slide in either direction — the knob will hold at the end for a moment then slide back to the middle.

4. **Visual feedback** — a fill bar follows the knob in known states (hidden in unknown state). In vertical layout, the header icon changes to match the current state icon and turns blue when in the right state.

## License

MIT
