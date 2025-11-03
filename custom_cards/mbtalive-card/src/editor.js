/**
 * MBTA Live Card Editor
 * Visual configuration editor for the MBTA Live card
 */

export class MBTALiveCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._initialized = false;
  }

  setConfig(config) {
    this._config = { ...(config || {}) };
    if (this._hass && !this._initialized) {
      this._render();
      this._initialized = true;
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialized) {
      this._render();
      this._initialized = true;
    }
  }

  get _device() {
    return this._config.device || '';
  }

  get _title() {
    return this._config.title || '';
  }

  get _badge_color() {
    return this._config.badge_color || '';
  }

  get _show_headsign() {
    return this._config.show_headsign !== false; // default to true
  }

  get _show_alerts() {
    return this._config.show_alerts !== false; // default to true
  }

  get _max_trains() {
    return this._config.max_trains || '';
  }

  get _show_departure_time() {
    return this._config.show_departure_time !== false; // default to true
  }

  get _swap_time_countdown() {
    return this._config.swap_time_countdown === true; // default to false
  }

  _render() {
    try {
      this.innerHTML = `
        <div class="card-config">
          <div class="option">
            <label>Device (MBTA Integration):</label>
            <select class="device-select">
              <option value="">Select a device...</option>
              ${this._getDeviceOptions()}
            </select>
          </div>
          <div class="option">
            <label>Title (Optional):</label>
            <input type="text" class="title-input" value="${this._title}" placeholder="MBTA Trains">
          </div>
          <div class="option">
            <label>Badge Color (Optional):</label>
            <input type="text" class="badge-color-input" value="${this._badge_color}" placeholder="#DA020E">
          </div>
          <div class="option">
            <label>Max Trains to Show (Optional, blank = all):</label>
            <input type="number" class="max-trains-input" value="${this._max_trains}" placeholder="All trains" min="1">
          </div>
          <div class="option">
            <label>
              <input type="checkbox" class="swap-time-countdown-input" ${this._swap_time_countdown ? 'checked' : ''}>
              Swap departure time and countdown positions
            </label>
          </div>
          <div class="option">
            <label>
              <input type="checkbox" class="show-departure-time-input" ${this._show_departure_time ? 'checked' : ''}>
              Show departure time (uncheck to hide departure time column)
            </label>
          </div>
          <div class="option">
            <label>
              <input type="checkbox" class="show-headsign-input" ${this._show_headsign ? 'checked' : ''}>
              Show destination/headsign column
            </label>
          </div>
          <div class="option">
            <label>
              <input type="checkbox" class="show-alerts-input" ${this._show_alerts ? 'checked' : ''}>
              Show service alerts
            </label>
          </div>
        </div>
        <style>
          .card-config {
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding: 16px;
          }
          .option {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .option label {
            font-weight: 500;
            margin-bottom: 4px;
          }
          .option select,
          .option input {
            padding: 8px;
            border: 1px solid var(--divider-color);
            border-radius: 4px;
            background: var(--card-background-color);
            color: var(--primary-text-color);
          }
          .device-select {
            min-height: 40px;
          }
        </style>
      `;

      // Add event listeners
      setTimeout(() => {
        const deviceSelect = this.querySelector('.device-select');
        const titleInput = this.querySelector('.title-input');
        const badgeColorInput = this.querySelector('.badge-color-input');
        const maxTrainsInput = this.querySelector('.max-trains-input');
        const swapTimeCountdownInput = this.querySelector('.swap-time-countdown-input');
        const showDepartureTimeInput = this.querySelector('.show-departure-time-input');
        const showHeadsignInput = this.querySelector('.show-headsign-input');
        const showAlertsInput = this.querySelector('.show-alerts-input');

        if (deviceSelect) {
          deviceSelect.value = this._device;
          deviceSelect.addEventListener('change', (e) => {
            this._updateConfig('device', e.target.value);
          });
        }

        if (titleInput) {
          titleInput.addEventListener('input', (e) => {
            this._updateConfig('title', e.target.value);
          });
        }

        if (badgeColorInput) {
          badgeColorInput.addEventListener('input', (e) => {
            this._updateConfig('badge_color', e.target.value);
          });
        }

        if (maxTrainsInput) {
          maxTrainsInput.addEventListener('input', (e) => {
            const value = e.target.value;
            this._updateConfig('max_trains', value ? parseInt(value) : undefined);
          });
        }

        if (swapTimeCountdownInput) {
          swapTimeCountdownInput.addEventListener('change', (e) => {
            this._updateConfig('swap_time_countdown', e.target.checked);
          });
        }

        if (showDepartureTimeInput) {
          showDepartureTimeInput.addEventListener('change', (e) => {
            this._updateConfig('show_departure_time', e.target.checked);
          });
        }

        if (showHeadsignInput) {
          showHeadsignInput.addEventListener('change', (e) => {
            this._updateConfig('show_headsign', e.target.checked);
          });
        }

        if (showAlertsInput) {
          showAlertsInput.addEventListener('change', (e) => {
            this._updateConfig('show_alerts', e.target.checked);
          });
        }
      }, 0);
    } catch (error) {
      console.error('Error rendering MBTALive card editor:', error);
      this.innerHTML = `
        <div style="padding: 16px; color: red;">
          Error loading editor: ${error.message}
        </div>
      `;
    }
  }

  _getDeviceOptions() {
    if (!this._hass) {
      return '<option value="">Loading...</option>';
    }

    const mbtaDevices = [];
    
    // Method 1: Look for devices from the MBTA integration via device registry
    if (this._hass.devices) {
      for (const deviceId in this._hass.devices) {
        const device = this._hass.devices[deviceId];
        if (device && device.name && (
          device.name.toLowerCase().includes('mbta') ||
          (device.manufacturer && device.manufacturer === 'MBTALive') ||
          (device.model && device.model === 'MBTA Live Trip Info')
        )) {
          mbtaDevices.push({
            id: deviceId,
            name: device.name
          });
        }
      }
    }

    // Method 2: If no devices found, try to infer from config entries and entity patterns
    if (mbtaDevices.length === 0 && this._hass.states) {
      const devicePatterns = new Set();
      
      // Look for MBTA entities and extract potential device names
      for (const entityId in this._hass.states) {
        if (entityId.startsWith('sensor.mbta_') && entityId.includes('upcoming')) {
          // Extract the middle part that would be the device identifier
          // e.g., sensor.mbta_red_line_downtown_upcoming -> "red_line_downtown"
          const parts = entityId.replace('sensor.mbta_', '').replace('_upcoming', '').replace('_following', '');
          if (parts && parts !== 'mbta') {
            devicePatterns.add(parts);
          }
        }
      }
      
      devicePatterns.forEach(pattern => {
        // Use the pattern as both ID and create a readable name
        const readableName = pattern.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        mbtaDevices.push({
          id: pattern,
          name: readableName
        });
      });
    }

    // Method 3: Fallback - look for any MBTA-related entities
    if (mbtaDevices.length === 0 && this._hass.states) {
      const entityGroups = new Map();
      
      for (const entityId in this._hass.states) {
        if (entityId.toLowerCase().includes('mbta')) {
          // Group entities by their base name (removing sensor type suffix)
          const baseName = entityId.replace(/_(upcoming|following|departure|arrival|alerts|status)$/, '');
          const count = entityGroups.get(baseName) || 0;
          entityGroups.set(baseName, count + 1);
        }
      }
      
      // Add groups that have multiple related entities (likely complete integrations)
      entityGroups.forEach((count, baseName) => {
        if (count > 1) {
          const cleanName = baseName.replace('sensor.', '').replace(/_/g, ' ');
          mbtaDevices.push({
            id: baseName.replace('sensor.', ''),
            name: cleanName.replace(/\b\w/g, l => l.toUpperCase())
          });
        }
      });
    }

    if (mbtaDevices.length === 0) {
      return '<option value="">No MBTA devices found - ensure MBTALive integration is configured</option>';
    }

    return mbtaDevices
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(device => `<option value="${device.id}">${device.name}</option>`)
      .join('');
  }

  _updateConfig(key, value) {
    if (!this._config) {
      this._config = {};
    }

    if (value === '' || value === null || value === undefined) {
      delete this._config[key];
    } else {
      this._config[key] = value;
    }

    // Fire event to update the card config
    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}