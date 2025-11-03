/**
 * MBTA Live Card - Main Card Class
 * A Lovelace custom card for displaying MBTA train information
 */

import { cardStyles } from './styles.js';
import { MBTACardUtils } from './utils.js';

export class MBTALiveCard extends HTMLElement {
  setConfig(config) {
    this.config = config || {};
    this._device = (config && config.device) || '';
    this._entities = []; // Will be populated dynamically
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
    
    // If no device specified, can't find entities
    if (!this._device) return;
    
    // Method 1: Find entities that belong to the specified device via entity registry
    if (this._hass.entities) {
      for (const entityId in this._hass.entities) {
        const entityEntry = this._hass.entities[entityId];
        if (entityEntry && entityEntry.device_id === this._device) {
          // Check if it's a trip sensor, status sensor, arrival sensor, or alerts sensor
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
        // Try matching the device pattern in the entity ID
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
    
    // Sort entities to put "upcoming" first, "following" second, then status sensors, then other trip sensors
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
      
    // If we only found one main entity, check if it has 'next' trips in attributes
    if (this._entities.length === 1) {
      const mainEntity = this._hass.states[this._entities[0]];
      if (mainEntity && mainEntity.attributes && mainEntity.attributes.next) {
        // Keep the main entity, but we'll render additional rows from the 'next' attribute
        // This will be handled in the render function
      }
    }
  }

  _render() {
    if (!this.shadowRoot) return;
    const hass = this._hass;

    // Build HTML
    const container = document.createElement('div');
    container.className = 'card';

    // Check if device is configured
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

    // Use configured title or device name as default
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

    // Render alerts if enabled and available
    if (this.config.show_alerts !== false) { // default to true
      this._renderAlerts(container);
    }

    const list = document.createElement('div');
    list.className = 'train-list';

    // If no entities found, show helpful message
    if (this._entities.length === 0) {
      const noData = document.createElement('div');
      noData.className = 'unavailable';
      noData.textContent = `No trip sensors found for device: ${this._device}`;
      list.appendChild(noData);
      this.shadowRoot.innerHTML = '';
      const styleEl = document.createElement('style');
      styleEl.textContent = cardStyles;
      this.shadowRoot.appendChild(styleEl);
      this.shadowRoot.appendChild(container);
      container.appendChild(list);
      return;
    }

    // Process main entity and potential additional trips
    const mainEntityId = this._entities[0];
    const mainStateObj = hass.states[mainEntityId];
    
    if (!mainStateObj) {
      const missing = document.createElement('div');
      missing.className = 'unavailable';
      missing.textContent = `${mainEntityId} not found`;
      list.appendChild(missing);
    } else {
      // Find trip entities, status entity, and arrival entity
      const tripEntities = this._entities.filter(id => 
        id.includes('upcoming') || id.includes('following') || id.match(/trip|train/i)
      );
      const statusEntity = this._entities.find(id => 
        id.includes('vehicle_status') || (id.includes('status') && !id.includes('arrival'))
      );
      const arrivalEntity = this._entities.find(id => 
        id.includes('arrival') && (id.includes('time') || id.includes('arrival_time'))
      );
      
      console.log('All entities found:', this._entities);
      console.log('Status entity:', statusEntity);
      console.log('Arrival entity:', arrivalEntity);
      
      // Render main trip (Upcoming)
      this._renderTripRow(list, mainStateObj, mainEntityId, true);
      
      // Render additional trip entities if available (Following has full data)
      if (tripEntities.length > 1) {
        for (let i = 1; i < tripEntities.length; i++) {
          const entityId = tripEntities[i];
          const stateObj = hass.states[entityId];
          if (stateObj) {
            this._renderTripRow(list, stateObj, entityId, false);
          }
        }
      }
      
      // Render any additional trips from main sensor's 'next' attribute (trip 3+)
      if (mainStateObj.attributes && mainStateObj.attributes.next && Array.isArray(mainStateObj.attributes.next)) {
        // Find the arrival time sensor
        const arrivalTimeEntity = this._entities.find(id => 
          id.includes('arrival_time') || (id.includes('arrival') && id.includes('time'))
        );
        const arrivalTimeStateObj = arrivalTimeEntity ? hass.states[arrivalTimeEntity] : null;
        const arrivalTimeNextArray = arrivalTimeStateObj?.attributes?.next || [];
        
        console.log('Arrival time entity:', arrivalTimeEntity);
        console.log('Arrival time next array:', arrivalTimeNextArray);
        console.log('Main state obj next array:', mainStateObj.attributes.next);
        
        // Only render trips that don't already have dedicated sensors
        let additionalTripsToRender = tripEntities.length > 1 ? 
          mainStateObj.attributes.next.slice(tripEntities.length - 1) : 
          mainStateObj.attributes.next;
          
        // Apply max_trains limit if specified
        if (this.config.max_trains && typeof this.config.max_trains === 'number') {
          const currentlyRendered = tripEntities.length;
          const maxAdditional = this.config.max_trains - currentlyRendered;
          if (maxAdditional > 0) {
            additionalTripsToRender = additionalTripsToRender.slice(0, maxAdditional);
          } else {
            additionalTripsToRender = [];
          }
        }
          
        // For arrival times, use the same slicing logic as departure times
        const additionalArrivalTimes = tripEntities.length > 1 ? 
          arrivalTimeNextArray.slice(tripEntities.length - 1, tripEntities.length - 1 + additionalTripsToRender.length) : 
          arrivalTimeNextArray.slice(0, additionalTripsToRender.length);
          
        additionalTripsToRender.forEach((nextTripCountdown, index) => {
          const tripNumber = tripEntities.length + index + 1;
          // For additional trips, status is not available so use a default
          const nextTripStatus = 'On time'; // Default since status isn't available for trip 3+
          
          // Use arrival time from the sliced arrival times array
          const nextTripArrival = additionalArrivalTimes[index] || null;
          
          console.log(`Trip ${tripNumber}: countdown=${nextTripCountdown}, arrival=${nextTripArrival}, index=${index}`);
          
          this._renderNextTripRow(list, mainStateObj, nextTripCountdown, tripNumber, nextTripStatus, nextTripArrival);
        });
      }
    }

    // attach
    this.shadowRoot.innerHTML = '';
    const styleEl = document.createElement('style');
    styleEl.textContent = cardStyles;
    this.shadowRoot.appendChild(styleEl);
    this.shadowRoot.appendChild(container);
    container.appendChild(list);
  }

  _renderAlerts(container) {
    if (!this._hass || this._entities.length === 0) return;

    // Look for alert entities
    const alertEntities = this._entities.filter(id => 
      id.includes('alerts') || id.includes('alert')
    );

    console.log('Alert entities found:', alertEntities);

    if (alertEntities.length === 0) return;

    const alerts = [];
    
    // Collect alerts from all alert entities
    alertEntities.forEach(entityId => {
      const alertState = this._hass.states[entityId];
      console.log(`Alert entity ${entityId}:`, alertState);
      
      if (alertState && alertState.state !== 'unavailable' && alertState.state !== 'unknown') {
        // Check if the state itself is an alert message (but skip numeric values which are usually counts)
        if (alertState.state && 
            alertState.state !== '0' && 
            alertState.state !== 'No alerts' && 
            alertState.state !== 'none' &&
            isNaN(alertState.state)) { // Skip numeric values (alert counts)
          alerts.push(alertState.state);
        }
        
        // Check attributes for alert messages
        if (alertState.attributes) {
          // Check for various alert attribute patterns
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
          
          // Also check if attributes themselves contain arrays or objects with alert data
          Object.keys(alertState.attributes).forEach(key => {
            const value = alertState.attributes[key];
            if (Array.isArray(value) && value.length > 0) {
              value.forEach(item => {
                if (item && typeof item === 'object' && (item.header_text || item.description_text)) {
                  if (item.header_text) alerts.push(item.header_text);
                  if (item.description_text) alerts.push(item.description_text);
                }
              });
            }
          });
        }
      }
    });

    console.log('All alerts collected:', alerts);

    // Remove duplicates and empty alerts
    const uniqueAlerts = [...new Set(alerts)].filter(alert => 
      alert && alert.trim() && alert !== 'No alerts' && alert !== '0' && alert !== 'none'
    );

    console.log('Unique alerts after filtering:', uniqueAlerts);

    if (uniqueAlerts.length === 0) return;

    // Create alerts container
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

    // Badge (line color + short name)
    const badge = document.createElement('div');
    badge.className = 'badge';
    const line = stateObj.attributes.line || MBTACardUtils.shortFromEntity(entityId);
    badge.textContent = MBTACardUtils.shortLine(line);
    const color = stateObj.attributes.color || this.config.badge_color || '#999';
    badge.style.background = color;
    row.appendChild(badge);

    // Check if we should swap countdown and departure time positions
    const swapPositions = this.config.swap_time_countdown === true;

    if (swapPositions) {
      // Departure time on the left (centered on row like countdown normally is)
      const departureTime = document.createElement('div');
      departureTime.className = 'departure-countdown'; // Use countdown styling for centering
      departureTime.textContent = MBTACardUtils.formatDepartureTime(stateObj);
      departureTime.title = 'Scheduled departure time';
      row.appendChild(departureTime);
    } else {
      // Departure countdown on the left (centered on entire row)
      const countdown = document.createElement('div');
      countdown.className = 'departure-countdown';
      countdown.textContent = MBTACardUtils.formatNext(stateObj);
      countdown.title = 'Next departure';
      row.appendChild(countdown);
    }

    // Main content
    const main = document.createElement('div');
    main.className = 'main';

    // Primary line: contains either countdown or departure time + headsign
    const primary = document.createElement('div');
    primary.className = 'line-primary';
    
    if (swapPositions) {
      // Show countdown in the main content area (where departure time normally is)
      const countdown = document.createElement('div');
      countdown.className = 'departure-time';
      countdown.textContent = MBTACardUtils.formatNext(stateObj);
      countdown.title = 'Next departure';
      primary.appendChild(countdown);
    } else {
      // Show departure time in the main content area (normal behavior)
      if (this.config.show_departure_time !== false) { // default to true (show time)
        const departureTime = document.createElement('div');
        departureTime.className = 'departure-time';
        departureTime.textContent = MBTACardUtils.formatDepartureTime(stateObj);
        departureTime.title = 'Scheduled departure time';
        primary.appendChild(departureTime);
      }
    }

    // Headsign / destination
    const headsign = document.createElement('div');
    headsign.className = 'headsign';
    headsign.textContent = stateObj.attributes.headsign || stateObj.attributes.to || 'Unknown destination';
    headsign.title = 'Destination / Headsign';
    primary.appendChild(headsign);

    main.appendChild(primary);

    // Secondary line: status (only show if we have status info)
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

    // Arrival time (right side, centered on entire row)
    const arrival = document.createElement('div');
    arrival.className = 'arrival-time';
    const arrivalTime = stateObj.attributes.arrival_time || stateObj.attributes.arrival_time_to || stateObj.attributes.arrival_countdown;
    arrival.textContent = MBTACardUtils.formatETA(arrivalTime);
    arrival.title = 'Expected arrival time';
    row.appendChild(arrival);

    // mark unavailable visually
    if (stateObj.state === 'unavailable' || stateObj.state === 'unknown') {
      row.classList.add('unavailable');
    }

    list.appendChild(row);
  }

  _renderNextTripRow(list, mainStateObj, nextTripCountdown, tripNumber, nextTripStatus = 'On time', nextTripArrival = null) {
    const row = document.createElement('div');
    row.className = 'train-row';

    // Badge (same line color as main trip)
    const badge = document.createElement('div');
    badge.className = 'badge';
    const line = mainStateObj.attributes.line || 'Trip';
    badge.textContent = MBTACardUtils.shortLine(line);
    const color = mainStateObj.attributes.color || this.config.badge_color || '#999';
    badge.style.background = color;
    row.appendChild(badge);

    // Check if we should swap countdown and departure time positions
    const swapPositions = this.config.swap_time_countdown === true;

    if (swapPositions) {
      // Departure time on the left (centered on row like countdown normally is)
      const departureTime = document.createElement('div');
      departureTime.className = 'departure-countdown'; // Use countdown styling for centering
      departureTime.textContent = MBTACardUtils.formatDepartureTimeFromCountdown(nextTripCountdown);
      departureTime.title = 'Scheduled departure time';
      row.appendChild(departureTime);
    } else {
      // Departure countdown on the left (centered on entire row)
      const countdown = document.createElement('div');
      countdown.className = 'departure-countdown';
      countdown.textContent = MBTACardUtils.formatNextTripCountdown(nextTripCountdown);
      countdown.title = 'Next departure';
      row.appendChild(countdown);
    }

    // Main content
    const main = document.createElement('div');
    main.className = 'main';

    // Primary line: contains either countdown or departure time + headsign
    const primary = document.createElement('div');
    primary.className = 'line-primary';
    
    if (swapPositions) {
      // Show countdown in the main content area (where departure time normally is)
      const countdown = document.createElement('div');
      countdown.className = 'departure-time';
      countdown.textContent = MBTACardUtils.formatNextTripCountdown(nextTripCountdown);
      countdown.title = 'Next departure';
      primary.appendChild(countdown);
    } else {
      // Show departure time in the main content area (normal behavior)
      if (this.config.show_departure_time !== false) { // default to true (show time)
        const departureTime = document.createElement('div');
        departureTime.className = 'departure-time';
        departureTime.textContent = MBTACardUtils.formatDepartureTimeFromCountdown(nextTripCountdown);
        departureTime.title = 'Scheduled departure time';
        primary.appendChild(departureTime);
      }
    }

    // Headsign (same as main trip)
    const headsign = document.createElement('div');
    headsign.className = 'headsign';
    headsign.textContent = mainStateObj.attributes.headsign || mainStateObj.attributes.to || 'Unknown destination';
    headsign.title = 'Destination / Headsign';
    primary.appendChild(headsign);

    main.appendChild(primary);

    // Secondary line: status (only for trips 1-2, not for 3+)
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

    // Arrival time (right side, centered on entire row)
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