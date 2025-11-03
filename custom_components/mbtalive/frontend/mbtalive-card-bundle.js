/**
 * MBTA Live Card - Complete Bundle
 * A Lovelace custom card for displaying MBTA train information
 * 
 * @version 2.0.0
 * @author MBTALive Project
 * @license MIT
 */

console.info(
  `%c  MBTA-LIVE-CARD \n%c  Version 2.0.0    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);

// CSS Styles
const cardStyles = `
  .card {
    font-family: var(--ha-card-font-family, Roboto, Arial, sans-serif);
    color: var(--primary-text-color);
  }
  .title {
    font-weight: 500;
    padding: 8px 16px;
    font-size: 14px;
  }
  .alerts {
    padding: 8px 16px;
    margin-bottom: 8px;
  }
  .alert {
    color: var(--primary-text-color);
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 4px;
    border-left: 4px solid var(--error-color, #f44336);
  }
  .alert:last-child {
    margin-bottom: 0;
  }
  .train-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 16px 16px 16px;
  }
  .train-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 8px;
    border-radius: 6px;
  }
  .badge {
    min-width: 28px;
    height: 28px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--ha-card-background, white);
    font-weight: 600;
    font-size: 12px;
    box-shadow: var(--ha-card-box-shadow, none);
    align-self: flex-start;
  }
  .departure-countdown {
    width: 45px;
    text-align: center;
    white-space: nowrap;
    flex-shrink: 0;
    align-self: center;
    font-weight: 600;
    font-size: 13px;
  }
  .main {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
  }
  .line-primary {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 13px;
  }
  .departure-time {
    width: 55px;
    text-align: left;
    white-space: nowrap;
    flex-shrink: 0;
    font-weight: 600;
  }
  .headsign {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .line-secondary {
    font-size: 12px;
    color: var(--secondary-text-color);
    margin-top: 2px;
  }
  .status {
    font-weight: 500;
  }
  .arrival-time {
    width: 65px;
    text-align: center;
    white-space: nowrap;
    flex-shrink: 0;
    align-self: center;
    font-weight: 600;
    font-size: 13px;
  }
  .unavailable {
    opacity: 0.6;
    font-style: italic;
  }
  .config-message {
    padding: 16px;
    text-align: center;
    color: var(--secondary-text-color);
  }
`;

// Utility class for formatting functions
class MBTACardUtils {
  
  static shortFromEntity(entityId) {
    const parts = entityId.split('.');
    return parts[1] || entityId;
  }

  static shortLine(line) {
    if (!line) return '';
    const m = line.match(/(Red|Blue|Green|Orange|Mattapan|Silver|Purple)/i);
    if (m) return m[0][0].toUpperCase();
    const tokens = line.split(/\s|\//);
    return tokens[0].slice(0, 2).toUpperCase();
  }

  static formatNext(stateObj) {
    const s = stateObj.state;
    if (!s || s === 'unavailable' || s === 'unknown') return '—';
    
    if (!isNaN(s)) {
      const n = Number(s);
      return n <= 0 ? 'Due' : `${n}m`;
    }
    
    if (typeof s === 'string') {
      const minMatch = s.match(/(\d+)\s*min/i);
      if (minMatch) {
        const num = parseInt(minMatch[1]);
        return num <= 0 ? 'Due' : `${num}m`;
      }
      if (s.match(/^\d+m$/)) return s;
    }
    
    if (stateObj.attributes.departure_time_to) {
      const timeToAttr = stateObj.attributes.departure_time_to;
      const minMatch = timeToAttr.match(/(\d+)\s*min/i);
      if (minMatch) {
        const num = parseInt(minMatch[1]);
        return num <= 0 ? 'Due' : `${num}m`;
      }
      return timeToAttr;
    }
    
    if (stateObj.attributes.departure_countdown) {
      const countdown = stateObj.attributes.departure_countdown;
      return isNaN(countdown) ? countdown : `${countdown}m`;
    }
    
    return String(s);
  }

  static formatNextTripCountdown(countdown) {
    if (!countdown) return '—';
    
    if (typeof countdown === 'string') {
      const minMatch = countdown.match(/(\d+)\s*min/i);
      if (minMatch) {
        const num = parseInt(minMatch[1]);
        return num <= 0 ? 'Due' : `${num}m`;
      }
      if (countdown.match(/^\d+m$/)) return countdown;
      return countdown;
    }
    
    if (typeof countdown === 'number') {
      return countdown <= 0 ? 'Due' : `${countdown}m`;
    }
    
    return String(countdown);
  }

  static formatStatus(stateObj) {
    const st = stateObj.attributes.status || stateObj.attributes.vehicle_status;
    if (!st) return 'On time';
    return st;
  }

  static formatETA(arrival) {
    if (!arrival) return '';
    try {
      const d = new Date(arrival);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
    } catch (e) {
      // ignore
    }
    if (typeof arrival === 'string') return arrival;
    if (typeof arrival === 'number') return arrival <= 0 ? 'Due' : `${arrival} min`;
    return '';
  }

  static formatDepartureTime(stateObj) {
    const departureTime = stateObj.attributes.departure_time || stateObj.attributes.scheduled_departure;
    if (departureTime) {
      try {
        const d = new Date(departureTime);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        }
      } catch (e) {
        // ignore
      }
    }
    
    const countdown = stateObj.state;
    if (!isNaN(countdown)) {
      const now = new Date();
      const departureDate = new Date(now.getTime() + (Number(countdown) * 60000));
      return departureDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    
    return '—';
  }

  static formatDepartureTimeFromCountdown(countdown) {
    if (typeof countdown === 'number' || !isNaN(countdown)) {
      const now = new Date();
      const departureDate = new Date(now.getTime() + (Number(countdown) * 60000));
      return departureDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    
    if (typeof countdown === 'string') {
      const minMatch = countdown.match(/(\d+)\s*min/i);
      if (minMatch) {
        const minutes = parseInt(minMatch[1]);
        const now = new Date();
        const departureDate = new Date(now.getTime() + (minutes * 60000));
        return departureDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
    }
    
    return '—';
  }
}

// Main Card Class
class MBTALiveCard extends HTMLElement {
  setConfig(config) {
    this.config = config || {};
    this._device = (config && config.device) || '';
    this._entities = [];
  }

  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateEntities();
    this._render();
  }

  _updateEntities() {
    if (!this._hass) return;
    
    this._entities = [];
    if (!this._device) return;
    
    // Method 1: Find entities that belong to the specified device via entity registry
    if (this._hass.entities) {
      for (const entityId in this._hass.entities) {
        const entityEntry = this._hass.entities[entityId];
        if (entityEntry && entityEntry.device_id === this._device) {
          if (entityId.includes('upcoming') || entityId.includes('following') || 
              entityId.includes('status') || entityId.includes('vehicle_status') ||
              entityId.includes('arrival') || entityId.includes('arrival_time') ||
              entityId.includes('alerts') || entityId.includes('alert') ||
              entityId.match(/trip|train/i)) {
            this._entities.push(entityId);
          }
        }
      }
    }
    
    // Method 2: If entity registry not available, try pattern matching with device name
    if (this._entities.length === 0) {
      const devicePattern = this._device.toLowerCase().replace(/[^a-z0-9]/g, '_');
      for (const entityId in this._hass.states) {
        if (entityId.includes(devicePattern)) {
          if (entityId.includes('upcoming') || entityId.includes('following') || 
              entityId.includes('status') || entityId.includes('vehicle_status') ||
              entityId.includes('arrival') || entityId.includes('arrival_time') ||
              entityId.includes('alerts') || entityId.includes('alert') ||
              entityId.match(/trip|train/i)) {
            this._entities.push(entityId);
          }
        }
      }
    }
    
    // Method 3: If still no matches, try matching by device name from device registry
    if (this._entities.length === 0 && this._hass.devices && this._hass.devices[this._device]) {
      const deviceInfo = this._hass.devices[this._device];
      if (deviceInfo && deviceInfo.name) {
        const deviceNamePattern = deviceInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        for (const entityId in this._hass.states) {
          if (entityId.includes(deviceNamePattern)) {
            if (entityId.includes('upcoming') || entityId.includes('following') || 
                entityId.includes('status') || entityId.includes('vehicle_status') ||
                entityId.includes('arrival') || entityId.includes('arrival_time') ||
                entityId.includes('alerts') || entityId.includes('alert') ||
                entityId.match(/trip|train/i)) {
              this._entities.push(entityId);
            }
          }
        }
      }
    }
    
    // Sort entities
    this._entities.sort((a, b) => {
      const getTripOrder = (id) => {
        if (id.includes('upcoming')) return 0;
        if (id.includes('following')) return 1;
        if (id.includes('status') || id.includes('vehicle_status')) return 2;
        if (id.match(/trip|train/i)) return 3;
        return 4;
      };
      return getTripOrder(a) - getTripOrder(b);
    });
  }

  _render() {
    if (!this.shadowRoot) return;
    const hass = this._hass;

    const container = document.createElement('div');
    container.className = 'card';

    if (!this._device) {
      const configMessage = document.createElement('div');
      configMessage.className = 'config-message';
      configMessage.textContent = 'Please configure a device in the card settings';
      container.appendChild(configMessage);
      
      this.shadowRoot.innerHTML = '';
      const styleEl = document.createElement('style');
      styleEl.textContent = cardStyles;
      this.shadowRoot.appendChild(styleEl);
      this.shadowRoot.appendChild(container);
      return;
    }

    let title = this.config.title;
    if (!title && this._device && this._hass.devices && this._hass.devices[this._device]) {
      title = this._hass.devices[this._device].name;
    }
    
    if (title) {
      const titleEl = document.createElement('div');
      titleEl.className = 'title';
      titleEl.textContent = title;
      container.appendChild(titleEl);
    }

    if (this.config.show_alerts !== false) {
      this._renderAlerts(container);
    }

    const list = document.createElement('div');
    list.className = 'train-list';

    if (this._entities.length === 0) {
      const noData = document.createElement('div');
      noData.className = 'unavailable';
      noData.textContent = `No trip sensors found for device: ${this._device}`;
      list.appendChild(noData);
    } else {
      const mainEntityId = this._entities[0];
      const mainStateObj = hass.states[mainEntityId];
      
      if (!mainStateObj) {
        const missing = document.createElement('div');
        missing.className = 'unavailable';
        missing.textContent = `${mainEntityId} not found`;
        list.appendChild(missing);
      } else {
        const tripEntities = this._entities.filter(id => 
          id.includes('upcoming') || id.includes('following') || id.match(/trip|train/i)
        );
        
        this._renderTripRow(list, mainStateObj, mainEntityId, true);
        
        if (tripEntities.length > 1) {
          for (let i = 1; i < tripEntities.length; i++) {
            const entityId = tripEntities[i];
            const stateObj = hass.states[entityId];
            if (stateObj) {
              this._renderTripRow(list, stateObj, entityId, false);
            }
          }
        }
        
        if (mainStateObj.attributes && mainStateObj.attributes.next && Array.isArray(mainStateObj.attributes.next)) {
          const arrivalTimeEntity = this._entities.find(id => 
            id.includes('arrival_time') || (id.includes('arrival') && id.includes('time'))
          );
          const arrivalTimeStateObj = arrivalTimeEntity ? hass.states[arrivalTimeEntity] : null;
          const arrivalTimeNextArray = arrivalTimeStateObj?.attributes?.next || [];
          
          let additionalTripsToRender = tripEntities.length > 1 ? 
            mainStateObj.attributes.next.slice(tripEntities.length - 1) : 
            mainStateObj.attributes.next;
            
          if (this.config.max_trains && typeof this.config.max_trains === 'number') {
            const currentlyRendered = tripEntities.length;
            const maxAdditional = this.config.max_trains - currentlyRendered;
            if (maxAdditional > 0) {
              additionalTripsToRender = additionalTripsToRender.slice(0, maxAdditional);
            } else {
              additionalTripsToRender = [];
            }
          }
            
          const additionalArrivalTimes = tripEntities.length > 1 ? 
            arrivalTimeNextArray.slice(tripEntities.length - 1, tripEntities.length - 1 + additionalTripsToRender.length) : 
            arrivalTimeNextArray.slice(0, additionalTripsToRender.length);
            
          additionalTripsToRender.forEach((nextTripCountdown, index) => {
            const tripNumber = tripEntities.length + index + 1;
            const nextTripStatus = 'On time';
            const nextTripArrival = additionalArrivalTimes[index] || null;
            
            this._renderNextTripRow(list, mainStateObj, nextTripCountdown, tripNumber, nextTripStatus, nextTripArrival);
          });
        }
      }
    }

    this.shadowRoot.innerHTML = '';
    const styleEl = document.createElement('style');
    styleEl.textContent = cardStyles;
    this.shadowRoot.appendChild(styleEl);
    this.shadowRoot.appendChild(container);
    container.appendChild(list);
  }

  _renderAlerts(container) {
    if (!this._hass || this._entities.length === 0) return;

    const alertEntities = this._entities.filter(id => 
      id.includes('alerts') || id.includes('alert')
    );

    if (alertEntities.length === 0) return;

    const alerts = [];
    
    alertEntities.forEach(entityId => {
      const alertState = this._hass.states[entityId];
      
      if (alertState && alertState.state !== 'unavailable' && alertState.state !== 'unknown') {
        if (alertState.state && 
            alertState.state !== '0' && 
            alertState.state !== 'No alerts' && 
            alertState.state !== 'none' &&
            isNaN(alertState.state)) {
          alerts.push(alertState.state);
        }
        
        if (alertState.attributes) {
          const alertAttrs = ['alert', 'alerts', 'alert_text', 'description', 'header_text', 'description_text'];
          
          alertAttrs.forEach(attrName => {
            const attrValue = alertState.attributes[attrName];
            if (attrValue) {
              if (typeof attrValue === 'string' && attrValue !== 'No alerts' && attrValue !== 'none') {
                alerts.push(attrValue);
              } else if (Array.isArray(attrValue)) {
                attrValue.forEach(alert => {
                  if (alert && typeof alert === 'string') {
                    alerts.push(alert);
                  } else if (alert && typeof alert === 'object') {
                    if (alert.header_text) alerts.push(alert.header_text);
                    if (alert.description_text) alerts.push(alert.description_text);
                    if (alert.text) alerts.push(alert.text);
                  }
                });
              }
            }
          });
        }
      }
    });

    const uniqueAlerts = [...new Set(alerts)].filter(alert => 
      alert && alert.trim() && alert !== 'No alerts' && alert !== '0' && alert !== 'none'
    );

    if (uniqueAlerts.length === 0) return;

    const alertsContainer = document.createElement('div');
    alertsContainer.className = 'alerts';

    uniqueAlerts.forEach(alertText => {
      const alertEl = document.createElement('div');
      alertEl.className = 'alert';
      alertEl.textContent = alertText;
      alertsContainer.appendChild(alertEl);
    });

    container.appendChild(alertsContainer);
  }

  _renderTripRow(list, stateObj, entityId, isMain) {
    const row = document.createElement('div');
    row.className = 'train-row';

    const badge = document.createElement('div');
    badge.className = 'badge';
    const line = stateObj.attributes.line || MBTACardUtils.shortFromEntity(entityId);
    badge.textContent = MBTACardUtils.shortLine(line);
    const color = stateObj.attributes.color || this.config.badge_color || '#999';
    badge.style.background = color;
    row.appendChild(badge);

    const swapPositions = this.config.swap_time_countdown === true;

    if (swapPositions) {
      const departureTime = document.createElement('div');
      departureTime.className = 'departure-countdown';
      departureTime.textContent = MBTACardUtils.formatDepartureTime(stateObj);
      departureTime.title = 'Scheduled departure time';
      row.appendChild(departureTime);
    } else {
      const countdown = document.createElement('div');
      countdown.className = 'departure-countdown';
      countdown.textContent = MBTACardUtils.formatNext(stateObj);
      countdown.title = 'Next departure';
      row.appendChild(countdown);
    }

    const main = document.createElement('div');
    main.className = 'main';

    const primary = document.createElement('div');
    primary.className = 'line-primary';
    
    if (swapPositions) {
      const countdown = document.createElement('div');
      countdown.className = 'departure-time';
      countdown.textContent = MBTACardUtils.formatNext(stateObj);
      countdown.title = 'Next departure';
      primary.appendChild(countdown);
    } else {
      if (this.config.show_departure_time !== false) {
        const departureTime = document.createElement('div');
        departureTime.className = 'departure-time';
        departureTime.textContent = MBTACardUtils.formatDepartureTime(stateObj);
        departureTime.title = 'Scheduled departure time';
        primary.appendChild(departureTime);
      }
    }

    const headsign = document.createElement('div');
    headsign.className = 'headsign';
    headsign.textContent = stateObj.attributes.headsign || stateObj.attributes.to || 'Unknown destination';
    headsign.title = 'Destination / Headsign';
    primary.appendChild(headsign);

    main.appendChild(primary);

    const status = MBTACardUtils.formatStatus(stateObj);
    if (status && status !== 'On time') {
      const secondary = document.createElement('div');
      secondary.className = 'line-secondary';
      
      const statusEl = document.createElement('span');
      statusEl.className = 'status';
      statusEl.textContent = status;
      statusEl.title = 'Status';
      secondary.appendChild(statusEl);
      
      main.appendChild(secondary);
    }

    row.appendChild(main);

    const arrival = document.createElement('div');
    arrival.className = 'arrival-time';
    const arrivalTime = stateObj.attributes.arrival_time || stateObj.attributes.arrival_time_to || stateObj.attributes.arrival_countdown;
    arrival.textContent = MBTACardUtils.formatETA(arrivalTime);
    arrival.title = 'Expected arrival time';
    row.appendChild(arrival);

    if (stateObj.state === 'unavailable' || stateObj.state === 'unknown') {
      row.classList.add('unavailable');
    }

    list.appendChild(row);
  }

  _renderNextTripRow(list, mainStateObj, nextTripCountdown, tripNumber, nextTripStatus = 'On time', nextTripArrival = null) {
    const row = document.createElement('div');
    row.className = 'train-row';

    const badge = document.createElement('div');
    badge.className = 'badge';
    const line = mainStateObj.attributes.line || 'Trip';
    badge.textContent = MBTACardUtils.shortLine(line);
    const color = mainStateObj.attributes.color || this.config.badge_color || '#999';
    badge.style.background = color;
    row.appendChild(badge);

    const swapPositions = this.config.swap_time_countdown === true;

    if (swapPositions) {
      const departureTime = document.createElement('div');
      departureTime.className = 'departure-countdown';
      departureTime.textContent = MBTACardUtils.formatDepartureTimeFromCountdown(nextTripCountdown);
      departureTime.title = 'Scheduled departure time';
      row.appendChild(departureTime);
    } else {
      const countdown = document.createElement('div');
      countdown.className = 'departure-countdown';
      countdown.textContent = MBTACardUtils.formatNextTripCountdown(nextTripCountdown);
      countdown.title = 'Next departure';
      row.appendChild(countdown);
    }

    const main = document.createElement('div');
    main.className = 'main';

    const primary = document.createElement('div');
    primary.className = 'line-primary';
    
    if (swapPositions) {
      const countdown = document.createElement('div');
      countdown.className = 'departure-time';
      countdown.textContent = MBTACardUtils.formatNextTripCountdown(nextTripCountdown);
      countdown.title = 'Next departure';
      primary.appendChild(countdown);
    } else {
      if (this.config.show_departure_time !== false) {
        const departureTime = document.createElement('div');
        departureTime.className = 'departure-time';
        departureTime.textContent = MBTACardUtils.formatDepartureTimeFromCountdown(nextTripCountdown);
        departureTime.title = 'Scheduled departure time';
        primary.appendChild(departureTime);
      }
    }

    const headsign = document.createElement('div');
    headsign.className = 'headsign';
    headsign.textContent = mainStateObj.attributes.headsign || mainStateObj.attributes.to || 'Unknown destination';
    headsign.title = 'Destination / Headsign';
    primary.appendChild(headsign);

    main.appendChild(primary);

    if (tripNumber <= 2 && nextTripStatus && nextTripStatus !== 'On time') {
      const secondary = document.createElement('div');
      secondary.className = 'line-secondary';
      
      const statusEl = document.createElement('span');
      statusEl.className = 'status';
      statusEl.textContent = nextTripStatus;
      statusEl.title = 'Status';
      secondary.appendChild(statusEl);
      
      main.appendChild(secondary);
    }

    row.appendChild(main);

    const arrival = document.createElement('div');
    arrival.className = 'arrival-time';
    arrival.textContent = MBTACardUtils.formatETA(nextTripArrival);
    arrival.title = 'Expected arrival time';
    row.appendChild(arrival);

    list.appendChild(row);
  }

  getCardSize() {
    return this._entities ? this._entities.length + 1 : 1;
  }
}

// Visual Editor Class
class MBTALiveCardEditor extends HTMLElement {
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

  get _device() { return this._config.device || ''; }
  get _title() { return this._config.title || ''; }
  get _badge_color() { return this._config.badge_color || ''; }
  get _show_headsign() { return this._config.show_headsign !== false; }
  get _show_alerts() { return this._config.show_alerts !== false; }
  get _max_trains() { return this._config.max_trains || ''; }
  get _show_departure_time() { return this._config.show_departure_time !== false; }
  get _swap_time_countdown() { return this._config.swap_time_countdown === true; }

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

    if (mbtaDevices.length === 0 && this._hass.states) {
      const devicePatterns = new Set();
      
      for (const entityId in this._hass.states) {
        if (entityId.startsWith('sensor.mbta_') && entityId.includes('upcoming')) {
          const parts = entityId.replace('sensor.mbta_', '').replace('_upcoming', '').replace('_following', '');
          if (parts && parts !== 'mbta') {
            devicePatterns.add(parts);
          }
        }
      }
      
      devicePatterns.forEach(pattern => {
        const readableName = pattern.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        mbtaDevices.push({
          id: pattern,
          name: readableName
        });
      });
    }

    if (mbtaDevices.length === 0 && this._hass.states) {
      const entityGroups = new Map();
      
      for (const entityId in this._hass.states) {
        if (entityId.toLowerCase().includes('mbta')) {
          const baseName = entityId.replace(/_(upcoming|following|departure|arrival|alerts|status)$/, '');
          const count = entityGroups.get(baseName) || 0;
          entityGroups.set(baseName, count + 1);
        }
      }
      
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

    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

// Register the custom elements
customElements.define('mbtalive-card', MBTALiveCard);
customElements.define('mbtalive-card-editor', MBTALiveCardEditor);

// Add static methods for Home Assistant card management
MBTALiveCard.getConfigElement = () => {
  return document.createElement('mbtalive-card-editor');
};

MBTALiveCard.getStubConfig = () => {
  return {
    device: ''
  };
};

// Tell Home Assistant about the visual editor
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'mbtalive-card',
  name: 'MBTA Live Card',
  description: 'Display MBTA train departure times and status',
  preview: false,
  documentationURL: 'https://github.com/chiabre/MBTALive',
});

// Export for module systems and backward compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MBTALiveCard;
}