/**
 * MBTA Live Card Styles
 * CSS styles for the MBTA Live Lovelace card
 */

export const cardStyles = `
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