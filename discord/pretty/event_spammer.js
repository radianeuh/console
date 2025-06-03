/**
 * Discord Event Spammer Console Script
 *
 * This script automates sending scheduled event creation requests to Discord.
 * It dynamically fetches your authentication token and allows easy modification
 * of event details (name, description, location) while keeping dates fixed.
 *
 * To use:
 * 1. Open your browser's developer console (F12 or Ctrl+Shift+I).
 * 2. Paste this entire script into the console and press Enter.
 * 3. Use `startRequests()` to begin sending requests.
 * 4. Use `stopRequests()` to halt requests.
 * 5. Modify `config` object properties to change event details.
 */

// --- Global Variables for Control and Authentication ---
let requestIntervalId = null; // Stores the ID of the setInterval, allowing it to be cleared.
let authToken = ""; // Will hold the Discord authentication token after extraction.

// --- Configurable Request Parameters ---
// Easily modify these values to change the event details.
const config = {
    guildId: "1379518446487867462",
    name: "Defaul Event Name", // Change this to your desired event name.
    description: "Default Event Description", // Change this to your desired event description.
    privacyLevel: 2,
    scheduledStartTime: "2025-12-11T07:45:00.000Z",
    scheduledEndTime: "2026-05-30T21:45:00.000Z",
    entityType: 3,
    channelId: null,
    location: "Default Location", // Change this to your desired location.
    broadcastToDirectoryChannels: false,
    recurrenceRule: null,

    // --- Static Headers (usually don't need to be changed) ---
    userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0",
    xDiscordLocale: "en-US",
    xDiscordTimezone: "Europe/Paris",
    secFetchSite: "same-origin",
    secFetchMode: "cors",
    referrer: "https://discord.com"
};

try {
    authToken = window.webpackChunkdiscord_app.push([
        [Math.random()], {},
        (moduleExports) => {
            if (moduleExports.c) {
                for (const module of Object.keys(moduleExports.c)
                    .map(key => moduleExports.c[key].exports)
                    .filter(exportedModule => exportedModule)) {
                    if (module.default && module.default.getToken !== undefined) {
                        return module.default.getToken();
                    }
                    if (module.getToken !== undefined) {
                        return module.getToken();
                    }
                }
            }
            return null;
        }
    ]);
    window.webpackChunkdiscord_app.pop();
} catch (error) {
    console.error("Failed to extract auth token:", error);
    alert("Failed to obtain Discord authorization token. The script cannot run. Ensure you are logged into Discord in your browser.");
    throw error;
}

if (!authToken) {
    alert("Could not retrieve Discord auth token. Ensure you are logged in.");
    throw new Error("Authentication token is missing.");
}

/**
 * Sends the Discord scheduled event creation request with rate limit handling.
 */
async function sendDiscordEventRequest() {
    // Construct the request body from the configurable `config` object.
    const requestBody = JSON.stringify({
        name: config.name,
        description: config.description,
        privacy_level: config.privacyLevel,
        scheduled_start_time: config.scheduledStartTime,
        scheduled_end_time: config.scheduledEndTime,
        entity_type: config.entityType,
        channel_id: config.channelId,
        entity_metadata: {
            location: config.location
        },
        broadcast_to_directory_channels: config.broadcastToDirectoryChannels,
        recurrence_rule: config.recurrenceRule
    });

    try {
        const response = await fetch(`https://discord.com/api/v9/guilds/${config.guildId}/scheduled-events`, {
            credentials: "include",
            headers: {
                "User-Agent": config.userAgent,
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.5",
                "Sec-GPC": "1",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": config.secFetchMode,
                "Sec-Fetch-Site": config.secFetchSite,
                "Content-Type": "application/json",
                "Authorization": authToken,
                "X-Discord-Locale": config.xDiscordLocale,
                "X-Discord-Timezone": config.xDiscordTimezone,
                "X-Debug-Options": "bugReporterEnabled",
                "Alt-Used": "discord.com",
                "Priority": "u=0",
                "Pragma": "no-cache",
                "Cache-Control": "no-cache"
            },
            referrer: config.referrer,
            body: requestBody,
            method: "POST",
            mode: "cors"
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`%cRequest successful at ${new Date().toLocaleTimeString()}:`, 'color: green;', data);
        } else if (response.status === 429) {
            const errorData = await response.json();
            const retryAfterSeconds = errorData.retry_after;
            const globalRateLimit = errorData.global;

            console.warn(`%cRate limit hit! Retrying after ${retryAfterSeconds} seconds (Global: ${globalRateLimit})...`, 'color: orange; font-weight: bold;');

            // Clear the existing interval to prevent new requests from being sent
            // while we're waiting for the rate limit to expire.
            stopRequests();

            // Set a timeout to resume sending requests after the retry_after duration
            // Adding a small buffer (e.g., 500ms) is good practice.
            setTimeout(() => {
                console.log("%cResuming requests after rate limit...", 'color: blue;');
                startRequests(); // Restart the interval
            }, (retryAfterSeconds * 1000) + 500); // Convert to milliseconds and add buffer

        } else {
            const errorText = await response.text();
            console.error(`%cRequest failed with status ${response.status} at ${new Date().toLocaleTimeString()}:`, 'color: red;', errorText);
            if (response.status === 401 || response.status === 403) {
                console.error("%cAuthentication error detected. Stopping requests to prevent further issues.", 'color: darkred; font-weight: bold;');
                stopRequests();
            }
        }
    } catch (error) {
        console.error(`%cError during fetch request at ${new Date().toLocaleTimeString()}:`, 'color: red;', error);
    }
}

// --- Control Functions ---

/**
 * Starts sending Discord event creation requests every 2 seconds.
 */
async function startRequests() {
    if (requestIntervalId) {
        console.log("%cRequests are already running.", 'color: orange;');
        return;
    }

    console.log("%cStarting requests...", 'color: blue; font-weight: bold;');

    // Send one request immediately, then set up the interval for subsequent requests.
    sendDiscordEventRequest();
    requestIntervalId = setInterval(sendDiscordEventRequest, 2000); // Send every 2 seconds (2000ms).
    console.log(`%cRequests started. Interval ID: ${requestIntervalId}`, 'color: green; font-weight: bold;');
    console.log("To stop, type: %cstopRequests()", 'font-weight: bold; color: red;');
}

/**
 * Stops the ongoing Discord event creation requests.
 */
function stopRequests() {
    if (requestIntervalId) {
        clearInterval(requestIntervalId); // Clear the interval.
        requestIntervalId = null;         // Reset the interval ID.
        console.log("%cRequests stopped.", 'color: red; font-weight: bold;');
    } else {
        console.log("%cNo active requests to stop.", 'color: orange;');
    }
}

// --- Initial Setup and Instructions for the User ---
console.log("%cDiscord Event Spammer Script Loaded!", "font-size: 20px; font-weight: bold; color: #7289DA;");
console.log("------------------------------------");
console.log("To begin sending requests, type: %cstartRequests()", "font-weight: bold; color: green;");
console.log("To halt sending requests, type: %cstopRequests()", "font-weight: bold; color: red;");
console.log("\n%cCurrent configuration:", 'font-weight: bold;', config);

// Expose functions and config object globally for easy console access.
window.startRequests = startRequests;
window.stopRequests = stopRequests;
window.config = config;
