/**
 * Main JS file for WebConsole. Handles UI updates, event orchestration,
 * and acts as the central controller.
 * https://github.com/mesacarlos
 * 2019-2020 Carlos Mesa under MIT License.
 * Refactored for clarity.
 */

// --- Global Variables ---
const ansiParser = new AnsiUp(); // For parsing ANSI color codes in console output
const storageManager = new WebConsolePersistenceManager(); // Handles localStorage operations
const connectorManager = new WebConsoleConnectionManager(); // Manages WebSocket connections
let currentPlayerList = []; // Holds the list of players currently displayed in the UI - consider moving state into connector or manager
let wasPasswordAutoSent = false; // Flag: True if saved password was automatically sent on connection
let serverStatsIntervalId = -1; // Interval timer ID for polling server stats (CPU, RAM, etc.)
let commandHistoryPosition = -1; // Current index when browsing command history (-1 means not browsing)
let reconnectionIntervalId = null; // Interval timer ID for attempting reconnections

// --- Initialization --- (Called from WebConsoleJqueryHandler.js's document.ready)
function initializeWebConsole() {
	$("#serverContainer").hide(); // Start with the server view hidden
	storageManager.initializeSettings(); // Ensure settings object exists in storage
	storageManager.ensureNewStorageInitialized(); // Ensure storage for 'new' servers exists
	setLanguage(storageManager.getLanguagePreference()); // Load and apply the saved language
	loadServersFromJsonFile(); // Attempt to load servers from servers.json
	populateServerListDropdown(); // Populate the UI dropdown with saved servers

	// Check if running on HTTPS, adjust SSL checkbox default/state if needed
	if (location.protocol === 'https:') {
		// Pre-check and disable SSL boxes in the modal if served over HTTPS
		$("#server-ssl").prop('checked', true).prop("disabled", true);
		$("#new-server-ssl").prop('checked', true).prop("disabled", true);
		// Also hide the specific advice for HTTP users about needing SSL for HTTPS pages
		$("#addServerModalSslAdvice").hide();
	} else {
		// Show the advice if on HTTP
		$("#addServerModalSslAdvice").show(); // Or ensure it's visible by default if needed
	}

	// Data Sanitization: Remove servers with invalid names from legacy storage (from v1.4-rev2 fix)
	// Consider applying similar logic to the 'new' server storage if needed.
	const legacyServers = storageManager.retrieveAllLegacyServerConfigurations();
	let serversRemovedCount = 0;
	legacyServers.forEach(server => {
		if (/[<>"']/.test(server.serverName)) { // Check for invalid characters
			console.warn(`Removing legacy server with invalid name: ${server.serverName}`);
			storageManager.deleteLegacyServerConfiguration(server.serverName);
			serversRemovedCount++;
		}
	});
	if (serversRemovedCount > 0) {
		console.log(`Removed ${serversRemovedCount} legacy server(s) with invalid names.`);
		populateServerListDropdown(); // Update the UI list if servers were removed
	}
}


// --- Server List Management ---

/**
 * Attempts to load an initial list of servers from a 'servers.json' file.
 * If the file content has changed since the last load (based on hash),
 * it updates the stored server configurations.
 */
function loadServersFromJsonFile() {
	const storedHash = storageManager.retrieveSetting('serverListHash'); // Use settings for hash storage

	// Simple hash function (consider a more robust one if collision resistance is critical)
	const simpleHashCode = (str) => {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash |= 0; // Convert to 32bit integer
		}
		return hash.toString(); // Return as string for comparison
	};

	fetch('servers.json')
		.then(response => {
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return response.text();
		})
		.then(jsonString => {
			const currentHash = simpleHashCode(jsonString);
			if (storedHash !== currentHash) {
				console.log("servers.json has changed. Updating stored servers.");
				storageManager.updateSetting('serverListHash', currentHash); // Store the new hash
				try {
					const serversFromJson = JSON.parse(jsonString);
					// Assume servers.json contains only legacy format servers for now
					// If it can contain both, logic needs adjustment here.
					serversFromJson.forEach(serverData => {
						// Basic validation before saving
						if (serverData.serverName && serverData.serverURI) {
							// Assume version 0 (legacy) if not specified in JSON
							const serverVersion = serverData.serverVersionType === 1 ? 1 : 0;
							const serverToAdd = new WSServer(serverData.serverName, serverData.serverURI, serverVersion);
							if (serverVersion === 0) {
								storageManager.persistLegacyServerConfiguration(serverToAdd);
							} else {
								storageManager.persistNewServerConfiguration(serverToAdd);
							}
						} else {
							console.warn("Skipping invalid server entry from servers.json:", serverData);
						}
					});
					populateServerListDropdown(); // Update UI after potential changes
				} catch (parseError) {
					console.error("Error parsing servers.json:", parseError);
					// Optionally clear the hash if parsing fails?
					// storageManager.updateSetting('serverListHash', null);
				}
			} else {
				console.info("servers.json hasn't changed since last check.");
			}
		})
		.catch(error => {
			// Log only if the file likely existed but couldn't be fetched/processed
			if (error.message.includes("HTTP error")) {
				console.error('Error fetching or processing servers.json:', error);
			} else {
				// Likely a 404 Not Found, which is acceptable if the file is optional
				console.info('servers.json not found or could not be loaded (this might be expected).');
			}
			// Still ensure the dropdown is populated with whatever is in storage
			populateServerListDropdown();
		});
}

/**
 * Updates the server list dropdown menu in the UI based on stored configurations.
 */
function populateServerListDropdown() {
	const serverListDropdown = $('#ServerListDropDown'); // Cache jQuery selector

	// Clear existing server entries (keeping "Add Server" and divider)
	serverListDropdown.find('.servermenuitem').remove();

	const legacyServers = storageManager.retrieveAllLegacyServerConfigurations();
	const newServers = storageManager.retrieveAllNewServerConfigurations();
	const allServers = [...legacyServers, ...newServers]; // Combine lists

	// Add each server to the dropdown
	if (allServers.length > 0) {
		allServers.forEach(server => {
			// Sanitize server name for display and use in onclick attribute
			const safeServerName = server.serverName
				.replace(/</g, "<")
				.replace(/>/g, ">")
				.replace(/'/g, "\\'") // Escape single quotes for JS string literal
				.replace(/"/g, '\\"'); // Escape double quotes

			const displayName = server.serverName.replace(/</g, "<").replace(/>/g, ">");

			// Create the link element
			const serverLink = `<a class="dropdown-item servermenuitem" href="#" onclick="activateServerView('${safeServerName}')">${displayName}</a>`;
			serverListDropdown.append(serverLink);
		});
	} else {
		// Show a "No servers added" message if the list is empty
		serverListDropdown.append('<a class="dropdown-item servermenuitem disabled" href="#" id="noServersAdded">No servers added</a>');
		// Ensure the translation is applied if the element already exists
		if (currentLanguageStrings && currentLanguageStrings.noServersAdded) {
			$('#noServersAdded').text(currentLanguageStrings.noServersAdded);
		}
	}
}


// --- Server View Activation and Connection Handling ---

/**
 * Switches the UI to the server management view for the specified server.
 * Loads or creates a WebSocket connection for the server.
 * @param {string} serverName - The name of the server to activate.
 */
function activateServerView(serverName) {
	console.log(`Activating view for server: ${serverName}`);
	// Switch UI containers
	$("#welcomeContainer").hide();
	$("#serverContainer").show();

	// Update server title display
	const safeDisplayName = serverName.replace(/</g, "<").replace(/>/g, ">");
	$("#serverTitle").text(safeDisplayName);

	// Clear console area and enable command input
	$("#consoleTextArea").empty(); // Use empty() for better clearing
	$("#commandInput").prop("disabled", false).val(''); // Enable and clear input
	$("#sendCommandButton").prop("disabled", false);
	$("#loggedUsernameLabel").text("Unknown"); // Reset user info display
	$("#loggedUserTypeLabel").text("Unknown");
	$("#playerlist").empty(); // Clear player list
	currentPlayerList = []; // Reset internal player list state


	// Reset state variables for the new server view
	wasPasswordAutoSent = false;
	commandHistoryPosition = -1; // Reset command history navigation index
	stopServerStatsPolling(); // Stop polling from previous server if active


	// --- Connection Management ---
	connectorManager.getConnection(serverName); // Get existing or create new connection

	if (!connectorManager.currentConnection) {
		console.error(`Failed to get or create connection for ${serverName}. Aborting view activation.`);
		appendMessageToConsoleUI(`Error: Could not establish connection to ${safeDisplayName}. Please check configuration.`, new Date().toLocaleTimeString());
		$("#commandInput").prop("disabled", true); // Disable input if connection failed
		$("#sendCommandButton").prop("disabled", true);
		return;
	}

	// --- Load Existing Messages & Subscribe ---
	const connection = connectorManager.currentConnection;
	const messageProcessor = (connection.connectionVersionType === 1) ? processWebSocketMessageNew : processWebSocketMessageLegacy;

	// Display previously received messages for this connection
	console.log(`Loading ${connection.receivedMessages.length} cached messages for ${serverName}`);
	connection.receivedMessages.forEach(message => {
		// Avoid reprocessing authentication requests (status 401) when reopening view
		if (message.status !== 401) {
			try {
				messageProcessor(message);
			} catch(e) {
				console.error("Error processing cached message:", e, message);
			}
		}
	});

	// Subscribe the appropriate message processor function to handle future messages
	// Note: getConnection already clears old subscribers, so this adds the new one.
	connection.addMessageSubscriber(messageProcessor);
	console.log(`Subscribed message processor for ${serverName}. Type: ${connection.connectionVersionType === 1 ? 'New' : 'Legacy'}`);

	// Start polling for server stats if not already started by a message handler
	// (The message handlers also start polling after successful login)
	// Ensure polling doesn't start if the connection immediately requires login (status 401)
	if (serverStatsIntervalId === -1 && connection.isLoggedIn) {
		startServerStatsPolling();
	}
}

/**
 * Attempts to reconnect to the specified server. Called by the reconnection interval.
 * NOTE: This function seems to just reload the connection, which might trigger
 * the standard connection flow again. The interval is set in `handleConnectionClosed`.
 * @param {string} serverName - The name of the server to attempt reconnection.
 */
function attemptReconnection(serverName) {
	console.log(`Attempting reconnection to ${serverName}...`);
	// Simply calling getConnection should trigger the connection attempt again.
	// The connector's onOpen/onError/onClose handlers will manage the UI state.
	connectorManager.getConnection(serverName);

	// The reconnection interval (`reconnectionIntervalId`) should be cleared
	// by the `handleWebSocketOpen` handler in the connector if successful.
	// If the connection attempt fails immediately (e.g., DNS error), the interval might keep running.
	// Consider adding logic here or in `handleConnectionClosed` to limit retries.
}


// --- WebSocket Message Processing ---

/**
 * Processes messages received from a legacy WebSocket connection.
 * Updates the UI based on the message content (status code).
 * @param {object} message - The parsed message object from the WebSocket.
 */
function processWebSocketMessageLegacy(message) {
	//console.log("Processing Legacy Message:", message);
	switch (message.status) {
		case 10: // Console Output
			appendMessageToConsoleUI(message.message, message.time);
			break;
		case 200: // LoggedIn successful
			if (!connectorManager.currentConnection.isLoggedIn) {
				// Only perform initial login actions once
				appendMessageToConsoleUI(message.message); // Show login success message
				updateUserInfoDisplay("Admin", message.as); // Show user role

				// Disable command input if the user role is 'viewer'
				if (message.as && message.as.toLowerCase() === "viewer") {
					$("#commandInput").prop("disabled", true);
					$("#sendCommandButton").prop("disabled", true);
					console.log("User is a viewer, disabling command input.");
				} else {
					$("#commandInput").prop("disabled", false);
					$("#sendCommandButton").prop("disabled", false);
				}

				// Mark as logged in (handled by connector, but good to be sure)
				// connectorManager.currentConnection.isLoggedIn = true; // Already done in connector

				// Request full log file if the setting is enabled
				if (storageManager.retrieveSetting("retrieveLogFile") === true) {
					console.log("Requesting full log file...");
					connectorManager.requestLogFile();
				}

				// Start polling for stats now that login is confirmed
				startServerStatsPolling();
			}
			break;
		case 400: // Unknown Command (response to EXEC)
			appendMessageToConsoleUI(message.message);
			break;
		case 401: // Authentication Required
			console.log("Authentication required (Legacy). Handling password.");
			handleAuthenticationRequest();
			break;
		case 1000: // Players List Update
			updatePlayerInfoUI(message.connectedPlayers, message.maxPlayers);
			try {
				const players = JSON.parse(message.players || "[]"); // Ensure players is valid JSON or default to empty array
				updatePlayerListUI(players);
				// Store the latest player list in the connection object
				if(connectorManager.currentConnection) {
					connectorManager.currentConnection.connectedPlayers = players;
				}
			} catch (e) {
				console.error("Error parsing player list JSON:", e, message.players);
			}
			break;
		case 1001: // CPU Usage Update
			updateCpuInfoUI(message.usage);
			break;
		case 1002: // RAM Usage Update
			updateRamInfoUI(message.free, message.used, message.max);
			break;
		case 1003: // TPS Update
			updateTpsInfoUI(message.tps, 20); // Assume max TPS is 20
			break;
		default:
			console.log('Received unknown message status (Legacy):', message);
	}
}

/**
 * Processes messages received from a new/redirector WebSocket connection.
 * Updates the UI based on the message content (status code).
 * NOTE: Kept separate as per instruction, logic is currently identical to legacy.
 *       If the protocol diverges, update this function accordingly.
 * @param {object} message - The parsed message object from the WebSocket.
 */
function processWebSocketMessageNew(message) {
	// console.log("Processing New Message:", message);
	switch (message.status) {
		case 10: // Console Output
			appendMessageToConsoleUI(message.message, message.time);
			break;
		case 200: // LoggedIn successful
			if (!connectorManager.currentConnection.isLoggedIn) {
				// Only perform initial login actions once
				appendMessageToConsoleUI(message.message); // Show login success message
				updateUserInfoDisplay("Admin", message.as); // Show user role (Assuming 'Admin' temporarily)

				// Disable command input if the user role is 'viewer'
				if (message.as && message.as.toLowerCase() === "viewer") {
					$("#commandInput").prop("disabled", true);
					$("#sendCommandButton").prop("disabled", true);
					console.log("User is a viewer, disabling command input.");
				} else {
					$("#commandInput").prop("disabled", false);
					$("#sendCommandButton").prop("disabled", false);
				}

				// Mark as logged in (handled by connector)
				// connectorManager.currentConnection.isLoggedIn = true;

				// Request full log file if the setting is enabled
				if (storageManager.retrieveSetting("retrieveLogFile") === true) {
					console.log("Requesting full log file...");
					connectorManager.requestLogFile();
				}
				// Start polling for stats now that login is confirmed
				startServerStatsPolling();
				connectorManager.currentConnection.isLoggedIn = true;
			}
			break;
		case 400: // Unknown Command (response to EXEC)
			appendMessageToConsoleUI(message.message);
			break;
		case 401: // Authentication Required
			console.log("Authentication required (New). Handling password.");
			handleAuthenticationRequest();
			break;
		case 1000: // Players List Update
			updatePlayerInfoUI(message.connectedPlayers, message.maxPlayers);
			try {
				const players = JSON.parse(message.players || "[]");
				updatePlayerListUI(players);
				if(connectorManager.currentConnection) {
					connectorManager.currentConnection.connectedPlayers = players;
				}
			} catch (e) {
				console.error("Error parsing player list JSON:", e, message.players);
			}
			break;
		case 1001: // CPU Usage Update
			updateCpuInfoUI(message.usage);
			break;
		case 1002: // RAM Usage Update
			updateRamInfoUI(message.free, message.used, message.max);
			break;
		case 1003: // TPS Update
			updateTpsInfoUI(message.tps, 20);
			break;
		default:
			console.log('Received unknown message status (New):', message);
	}
}

/**
 * Handles the logic when a 401 Unauthorized/Authentication Required message is received.
 * Attempts to send a saved password or prompts the user with the password modal.
 */
function handleAuthenticationRequest() {
	if (!connectorManager.currentConnection) return; // Should not happen if called from message handler

	const serverName = connectorManager.currentConnection.serverName;
	// Determine if it's legacy or new to retrieve the correct config
	const serverConfig = connectorManager.currentConnection.connectionVersionType === 1
		? storageManager.retrieveNewServerConfiguration(serverName)
		: storageManager.retrieveLegacyServerConfiguration(serverName);

	const savedPassword = serverConfig ? serverConfig.serverPassword : undefined;

	if (savedPassword !== undefined && !wasPasswordAutoSent) {
		// If a password is saved and we haven't tried it automatically yet
		console.log(`Attempting login with saved password for ${serverName}.`);
		wasPasswordAutoSent = true; // Set flag to true *before* sending
		connectorManager.sendLoginCommand(savedPassword);
	} else {
		// If no password saved, or if auto-sent password failed (another 401 received after auto-send)
		console.log(`No saved password or auto-login failed for ${serverName}. Showing password modal.`);
		// Reset the flag in case the auto-sent one was wrong, allowing manual entry
		wasPasswordAutoSent = false;
		// Ensure the modal is shown (Bootstrap 5 needs instance)
		const passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
		passwordModal.show();
	}
}


// --- UI Update Functions ---

/**
 * Appends a message to the console text area UI.
 * Handles ANSI color codes and optional timestamp prefix.
 * Manages auto-scrolling.
 * @param {string} messageContent - The raw message string.
 * @param {string|null} [timestamp] - Optional timestamp string from the server message.
 */
function appendMessageToConsoleUI(messageContent, timestamp) {
	const consoleTextArea = document.getElementById("consoleTextArea");
	if (!consoleTextArea) return; // Exit if console element not found

	// Check if console is scrolled to the bottom before adding new content
	// Tolerance helps with slight variations in height calculation
	const scrollTolerance = 10;
	const isScrolledToBottom = consoleTextArea.scrollHeight - consoleTextArea.scrollTop - consoleTextArea.clientHeight < scrollTolerance;

	// Sanitize message: prevent basic HTML injection (more robust sanitization might be needed)
	let sanitizedMsg = messageContent.replace(/</g, "<").replace(/>/g, ">");

	// Parse ANSI color codes to HTML spans
	let htmlMsg = ansiParser.ansi_to_html(sanitizedMsg);

	// Replace newlines with <br> tags AFTER ANSI parsing to preserve structure within color spans
	htmlMsg = htmlMsg.replace(/\r\n|\r|\n/g, "<br>");

	// --- Player Leave Detection (Specific logic from original code) ---
	// This logic is quite specific and might be better handled by dedicated server events if possible.
	// Keeping it as is, but refactored slightly.
	const leaveMatchString = " lost connection";
	if (htmlMsg.includes(leaveMatchString)) {
		// Extract player name (assumes format "PlayerName lost connection")
		// This is brittle; depends heavily on the exact server message format.
		const playerName = htmlMsg.substring(0, htmlMsg.indexOf(leaveMatchString)).trim();
		// Remove any potential HTML tags from the extracted name (e.g., from color codes)
		const plainPlayerName = playerName.replace(/<[^>]*>/g, '');
		console.log(`Detected player leave: ${plainPlayerName}`);

		// Remove player from the internal list and update UI
		const playerIndex = currentPlayerList.indexOf(plainPlayerName);
		if (playerIndex > -1) {
			currentPlayerList.splice(playerIndex, 1);
			// Re-render the entire player list UI (could be optimized)
			updatePlayerListUI(currentPlayerList);
			console.log(`Removed ${plainPlayerName} from UI list.`);
		}
	}
	// --- End Player Leave Detection ---


	// Prepend timestamp if enabled in settings
	if (storageManager.retrieveSetting("dateTimePrefix")) {
		let timePrefix = "";
		if (typeof timestamp === 'string') {
			// Use server-provided timestamp if available and not null
			timePrefix = `[${timestamp}] `;
		} else if (timestamp === undefined) {
			// Generate client-side timestamp if none provided by server
			timePrefix = `[${new Date().toLocaleTimeString()}] `;
		}
		// If timestamp is null, assume it was already part of the message (do nothing)

		htmlMsg = timePrefix + htmlMsg;
	}

	// Append the final HTML message to the console
	// Using jQuery's append for potentially complex HTML insertion
	$("#consoleTextArea").append(htmlMsg + "<br>");

	// Auto-scroll to bottom if it was already scrolled there
	if (isScrolledToBottom) {
		consoleTextArea.scrollTop = consoleTextArea.scrollHeight;
	}
}

/**
 * Updates the "Players Online" card UI.
 * @param {number|string} connected - Number of connected players.
 * @param {number|string} maximum - Maximum player capacity.
 */
function updatePlayerInfoUI(connected, maximum) {
	const connNum = parseInt(connected, 10) || 0;
	const maxNum = parseInt(maximum, 10) || 0; // Use 0 if maximum is unknown or invalid

	$("#connectedPlayers").text(connNum);
	$("#maxPlayers").text(maxNum > 0 ? maxNum : "Unknown"); // Display "Unknown" if max is 0

	// Calculate percentage, handle division by zero if maxPlayers is 0
	const percent = (maxNum > 0) ? (connNum / maxNum) * 100 : 0;
	const progressBar = $("#playerProgressBar");

	progressBar.width(percent + "%");
	// Update ARIA attributes for accessibility
	progressBar.closest('.progress').attr('aria-valuenow', connNum);
	progressBar.closest('.progress').attr('aria-valuemax', maxNum > 0 ? maxNum : 100); // Use 100 if max is unknown
}

/**
 * Updates the player list UI element.
 * @param {Array<string>} players - An array of player names.
 */
function updatePlayerListUI(players) {
	const playerListElement = $("#playerlist");
	var activeplayer = null

	//playerListElement.children()
	playerListElement.children().each(function(index,child) {
		child = $(child)
		if(child.hasClass("active")) {
			activeplayer = child[0].innerText
			//console.log("Saving active player: " + activeplayer)
		}

	})

	playerListElement.empty(); // Clear the current list

	currentPlayerList = players || []; // Update the internal state

	if (currentPlayerList.length === 0) {
		// Optional: Display a message if no players are online
		// playerListElement.append('<li class="list-group-item">No players online</li>');
	} else {
		currentPlayerList.forEach(player => {
			// Sanitize player name for display
			const safePlayerName = player.replace(/</g, "<").replace(/>/g, ">");
			var playerButton;
		//	console.log(safePlayerName + " " + activeplayer)

			if(safePlayerName === activeplayer) {
				 playerButton = $(`
                <a type="button" class="list-group-item list-group-item-action bg-dark text-light border-secondary active" href="#" data-bs-toggle="list" role="tab" aria-selected="true">
                    ${safePlayerName}
                </a>
            `);
			}else {

				// Create button element (Bootstrap 5 list group item acts like a button)
				 playerButton = $(`
                <a type="button" class="list-group-item list-group-item-action bg-dark text-light border-secondary" href="#" data-bs-toggle="list" role="tab">
                    ${safePlayerName}
                </a>
            `);
			}

			// Add click handler to toggle the 'active' state for selection
			playerButton.on('click', function() {
				// Remove active state from sibling buttons
				$(this).siblings().removeClass('active');
				// Toggle active state on the clicked button
				$(this).toggleClass('active');
			});

			playerListElement.append(playerButton);
		});
	}
}


/**
 * Updates the CPU usage card UI.
 * @param {number|string} usage - CPU usage percentage.
 */
function updateCpuInfoUI(usage) {
	const usageNum = parseFloat(usage) || 0;
	const usagePercent = Math.max(0, Math.min(100, usageNum)).toFixed(1); // Clamp between 0-100 and format

	$("#cpuInfo").text(usagePercent + "%");

	const progressBar = $("#CpuProgressBar");
	progressBar.width(usagePercent + "%");
	// Update ARIA attributes
	progressBar.closest('.progress').attr('aria-valuenow', usagePercent);
}

/**
 * Updates the RAM usage card UI.
 * @param {number|string} free - Free RAM (Units depend on server, assume MB).
 * @param {number|string} used - Used RAM (Units depend on server, assume MB).
 * @param {number|string} total - Total RAM (Units depend on server, assume MB).
 */
function updateRamInfoUI(free, used, total) {
	const usedNum = parseFloat(used) || 0;
	const totalNum = parseFloat(total) || 0;

	// Display values (consider adding units like 'MB' if consistent)
	$("#usedRam").text(usedNum.toFixed(1));
	$("#totalRam").text(totalNum.toFixed(1));

	// Calculate percentage, handle division by zero
	const percent = (totalNum > 0) ? (usedNum / totalNum) * 100 : 0;
	const clampedPercent = Math.max(0, Math.min(100, percent)); // Clamp between 0-100

	const progressBar = $("#RamProgressBar");
	progressBar.width(clampedPercent + "%");
	// Update ARIA attributes
	progressBar.closest('.progress').attr('aria-valuenow', usedNum.toFixed(1));
	progressBar.closest('.progress').attr('aria-valuemax', totalNum.toFixed(1));
}

/**
 * Updates the Server Ticks Per Second (TPS) card UI.
 * @param {number|string} tps - Current TPS value.
 * @param {number|string} maxTps - The maximum expected TPS (usually 20).
 */
function updateTpsInfoUI(tps, maxTps) {
	let tpsNum = parseFloat(tps) || 0;
	const maxTpsNum = parseFloat(maxTps) || 20; // Default to 20 if max not provided/invalid

	// Clamp TPS to be between 0 and maxTps (often servers report slightly above 20)
	tpsNum = Math.max(0, Math.min(maxTpsNum, tpsNum));

	$("#tps").text(tpsNum.toFixed(1)); // Display TPS with one decimal place
	$("#maxTps").text(maxTpsNum.toFixed(1));

	// Calculate percentage
	const percent = (maxTpsNum > 0) ? (tpsNum / maxTpsNum) * 100 : 0;
	const clampedPercent = Math.max(0, Math.min(100, percent)); // Clamp between 0-100

	const progressBar = $("#TpsProgressBar");
	progressBar.width(clampedPercent + "%");
	// Update ARIA attributes
	progressBar.closest('.progress').attr('aria-valuenow', tpsNum.toFixed(1));
	progressBar.closest('.progress').attr('aria-valuemax', maxTpsNum.toFixed(1));
}


/**
 * Updates the logged-in user information display.
 * @param {string} username - The username (often fixed like "Admin").
 * @param {string} role - The user's role (e.g., "Administrator", "Viewer").
 */
function updateUserInfoDisplay(username, role) {
	$("#loggedUsernameLabel").text(username || "Unknown");
	$("#loggedUserTypeLabel").text(role || "Unknown");
}

// --- Connection State Handling ---

/**
 * Handles the event when a WebSocket connection is closed.
 * Disables input, potentially starts reconnection attempts, and notifies the user.
 * Called externally by the connectors (handleWebSocketClose).
 * @param {string} serverName - The name of the server whose connection closed.
 * @param {string} [reason="Unknown"] - Optional reason why the connection closed.
 */
function handleConnectionClosed(serverName, reason = "Unknown") {
	console.log(`Connection closed handler invoked for ${serverName}. Reason: ${reason}`);
	// Check if the closed connection is the currently active one in the UI
	if (connectorManager.currentConnection && connectorManager.currentConnection.serverName === serverName) {
		console.log(`UI update: Disabling input for closed connection ${serverName}.`);
		// Disable command input and button as the connection is lost
		$("#commandInput").prop("disabled", true);
		$("#sendCommandButton").prop("disabled", true);
		stopServerStatsPolling(); // Stop polling for stats

		// Inform the user via the disconnection modal or console message
		appendMessageToConsoleUI(`*** DISCONNECTED FROM SERVER (${reason}) ***`, new Date().toLocaleTimeString());
		// Show the modal (Bootstrap 5)




		// --- Reconnection Logic ---
		// Clear any existing reconnection interval first
		if (reconnectionIntervalId === null) {
			const disconnectModal = new bootstrap.Modal(document.getElementById('loadingmodal'));
			disconnectModal.show();
			console.log(`Starting reconnection attempts every 5s for ${serverName}...`);
			reconnectionIntervalId = setInterval(attemptReconnection, 5000, serverName);
		}
		// Start attempting to reconnect every 5 seconds (adjust interval as needed)
		// Note: Consider adding a maximum retry limit.



	} else {
		console.log(`Connection closed for non-active server: ${serverName}. No UI changes needed.`);
	}

	// Clean up the connection object from the manager
	// Pass true to indicate it was closed remotely (or by error)
	connectorManager.removeConnection(serverName, true);
}


// --- UI Navigation and State Reset ---

/**
 * Switches the UI back to the initial welcome screen.
 * Stops polling intervals and resets UI elements related to the server view.
 */
function showWelcomeView() {
	console.log("Switching back to welcome view.");
	// Stop gathering info from the server
	stopServerStatsPolling();

	// Reset command history navigation state
	commandHistoryPosition = -1;

	// Clear server-specific UI indicators
	updatePlayerInfoUI(0, "Unknown");
	updateCpuInfoUI(0);
	updateRamInfoUI(0, 0, 0);
	updateTpsInfoUI(0, 0);
	$("#serverTitle").text(""); // Clear server title
	$("#consoleTextArea").empty(); // Clear console
	$("#loggedUsernameLabel").text("Unknown");
	$("#loggedUserTypeLabel").text("Unknown");
	$("#playerlist").empty();
	currentPlayerList = [];

	// Hide server container, show welcome container
	$("#serverContainer").hide();
	$("#welcomeContainer").show();

	// If there was an active connection, clear its subscribers
	// and potentially disconnect it cleanly if desired when navigating away.
	if (connectorManager.currentConnection) {
		console.log(`Clearing subscribers and active connection reference (${connectorManager.currentConnection.serverName}) on navigating home.`);
		connectorManager.currentConnection.clearMessageSubscribers();
		// Optionally disconnect cleanly:
		// connectorManager.currentConnection.disconnect();
		// connectorManager.removeConnection(connectorManager.currentConnection.serverName); // removeConnection handles disconnect
		connectorManager.currentConnection = null; // Clear the active reference
	}

	// Clear reconnection interval if user navigates back manually
	if (reconnectionIntervalId !== null) {
		clearInterval(reconnectionIntervalId);
		reconnectionIntervalId = null;
		console.log("Cleared reconnection interval due to manual navigation home.");
	}
}


// --- Utility Functions ---

/**
 * Starts the interval timer for polling server status (CPU, RAM, Players, TPS).
 */
function startServerStatsPolling() {
	// Clear any existing interval first to prevent duplicates
	stopServerStatsPolling();

	console.log("Starting server stats polling (interval: 2500ms).");
	// Call immediately once, then start interval
	connectorManager.requestServerStats();
	serverStatsIntervalId = setInterval(() => {
		// Check if still connected and logged in before requesting
		if (connectorManager.currentConnection && connectorManager.currentConnection.isLoggedIn) {
			connectorManager.requestServerStats();
		} else {
			// If connection lost or logged out, stop polling
			console.log("Stopping stats polling because connection is lost or not logged in.");
			stopServerStatsPolling();
		}
	}, 2500); // Poll every 2.5 seconds
}

/**
 * Stops the interval timer for polling server status.
 */
function stopServerStatsPolling() {
	if (serverStatsIntervalId !== -1) {
		clearInterval(serverStatsIntervalId);
		serverStatsIntervalId = -1;
		console.log("Stopped server stats polling.");
	}
}