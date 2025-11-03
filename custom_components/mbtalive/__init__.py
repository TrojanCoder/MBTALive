"""
Module for managing the MBTA integration with Home Assistant.

This module includes setup and unloading functions for the MBTA integration, 
as well as logging and error handling.
It defines methods to configure and unload MBTA-related platforms in Home Assistant, 
including logging setup progress,
handling exceptions, and forwarding setup to the sensor platform.

Functions:
- async_setup: Sets up the MBTA integration.
- async_setup_entry: Configures a new MBTA entry in Home Assistant.
- async_unload_entry: Unloads a MBTA config entry.

Logging:
- Uses logging to provide feedback and error messages for integration setup and unload events.
"""

import logging
import os
from pathlib import Path
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the MBTA integration."""
    _LOGGER.info("Setting up MBTA integration.")

    try:
        hass.data.setdefault(DOMAIN, {})  # Initialize domain data storage safely
        
        # Register the frontend resources for the custom card
        integration_dir = Path(__file__).parent
        frontend_path = integration_dir / "frontend" / "mbtalive-card-bundle.js"
        
        if frontend_path.exists():
            # Register the static path using the correct modern API
            url_path = f"/{DOMAIN}/mbtalive-card-bundle.js"
            hass.http.register_static_path(url_path, str(frontend_path), cache_headers=False)
            _LOGGER.info("Registered MBTALive card at %s", url_path)
            
            # Also register as a Lovelace resource
            try:
                hass.data.setdefault("lovelace", {})
                hass.data["lovelace"].setdefault("resources", [])
                
                resource = {
                    "url": url_path,
                    "type": "module"
                }
                
                if resource not in hass.data["lovelace"]["resources"]:
                    hass.data["lovelace"]["resources"].append(resource)
                    _LOGGER.info("Added MBTALive card as Lovelace resource")
            except Exception as e:
                _LOGGER.warning("Could not auto-register Lovelace resource: %s", e)
        else:
            _LOGGER.warning("MBTALive card bundle not found at %s", frontend_path)
        
        _LOGGER.debug("%s data initialized: %s", DOMAIN, hass.data[DOMAIN])
        return True
    except Exception as e:
        _LOGGER.error("Error during async_setup: %s", e)
        return False

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up a config entry for MBTA."""
    _LOGGER.debug("Setting up entry: %s", entry.entry_id)

    try:
        # Example: If using a handler, initialize and store it (commented as placeholder)
        # handler = SomeHandler(entry.data, session=async_get_clientsession(hass))
        # await handler.initialize()
        # hass.data[DOMAIN][entry.entry_id] = handler

        _LOGGER.debug("Forwarding setup to sensor platform for entry %s", entry.entry_id)
        await hass.config_entries.async_forward_entry_setups(entry, ["sensor"])
        return True
    except Exception as e:
        _LOGGER.error("Error setting up entry %s: %s", entry.entry_id, e)
        return False

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    _LOGGER.info("Unloading MBTA config entry: %s", entry.entry_id)

    try:
        unload_ok = await hass.config_entries.async_unload_platforms(entry, ["sensor"])
        if unload_ok:
            _LOGGER.debug("Successfully unloaded platforms for entry %s", entry.entry_id)
            return True
        else:
            _LOGGER.warning("Failed to unload platforms for entry %s", entry.entry_id)
            return False
    except Exception as e:
        _LOGGER.error("Error during unloading entry %s: %s", entry.entry_id, e)
        return False
