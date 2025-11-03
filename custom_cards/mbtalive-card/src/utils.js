/**
 * MBTA Live Card Utilities
 * Utility functions for formatting and data processing
 */

export class MBTACardUtils {
  
  static shortFromEntity(entityId) {
    // fallback short label
    const parts = entityId.split('.');
    return parts[1] || entityId;
  }

  static shortLine(line) {
    if (!line) return '';
    // prefer known short codes like 'Red', 'Blue', 'Green'
    const m = line.match(/(Red|Blue|Green|Orange|Mattapan|Silver|Purple)/i);
    if (m) return m[0][0].toUpperCase();
    // otherwise take first char or token
    const tokens = line.split(/\s|\//);
    return tokens[0].slice(0, 2).toUpperCase();
  }

  static formatNext(stateObj) {
    // The main sensor state is usually departure_countdown (minutes) or a string
    const s = stateObj.state;
    if (!s || s === 'unavailable' || s === 'unknown') return '—';
    
    // if numeric or numeric string
    if (!isNaN(s)) {
      const n = Number(s);
      return n <= 0 ? 'Due' : `${n}m`;
    }
    
    // Normalize existing formats to consistent 'm' suffix
    if (typeof s === 'string') {
      // Convert "X min" to "Xm"
      const minMatch = s.match(/(\d+)\s*min/i);
      if (minMatch) {
        const num = parseInt(minMatch[1]);
        return num <= 0 ? 'Due' : `${num}m`;
      }
      // If already in "Xm" format, keep it
      if (s.match(/^\d+m$/)) return s;
    }
    
    // if attribute departure_time_to exists and is like '5m'
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
    
    // countdown from 'next' attribute is usually just a string like "5 min" or number
    if (typeof countdown === 'string') {
      // Convert "X min" to "Xm" for consistency
      const minMatch = countdown.match(/(\d+)\s*min/i);
      if (minMatch) {
        const num = parseInt(minMatch[1]);
        return num <= 0 ? 'Due' : `${num}m`;
      }
      // If already in "Xm" format, keep it
      if (countdown.match(/^\d+m$/)) return countdown;
      return countdown;
    }
    
    if (typeof countdown === 'number') {
      return countdown <= 0 ? 'Due' : `${countdown}m`;
    }
    
    return String(countdown);
  }

  static formatStatus(stateObj) {
    // prefer explicit status attr
    const st = stateObj.attributes.status || stateObj.attributes.vehicle_status;
    if (!st) return 'On time';
    return st;
  }

  static formatETA(arrival) {
    if (!arrival) return '';
    // arrival might be a timestamp string
    try {
      // some integrations provide ISO strings
      const d = new Date(arrival);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
    } catch (e) {
      // ignore
    }
    // else arrival might be already human text like '5m' or number
    if (typeof arrival === 'string') return arrival;
    if (typeof arrival === 'number') return arrival <= 0 ? 'Due' : `${arrival} min`;
    return '';
  }

  static formatDepartureTime(stateObj) {
    // Try to get scheduled departure time from attributes
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
    
    // Fallback: calculate from current time + countdown
    const countdown = stateObj.state;
    if (!isNaN(countdown)) {
      const now = new Date();
      const departureDate = new Date(now.getTime() + (Number(countdown) * 60000));
      return departureDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    
    return '—';
  }

  static formatDepartureTimeFromCountdown(countdown) {
    // Calculate departure time from countdown
    if (typeof countdown === 'number' || !isNaN(countdown)) {
      const now = new Date();
      const departureDate = new Date(now.getTime() + (Number(countdown) * 60000));
      return departureDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    
    // Try to extract minutes from string like "15 min"
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