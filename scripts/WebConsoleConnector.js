/**
 * WebConsole Connector (Legacy Version) for WebConsole
 * Handles direct WebSocket connections to a WebConsole server.
 * https://github.com/mesacarlos
 * 2019-2020 Carlos Mesa under MIT License.
 * Refactored for clarity.
 */
class WebConsoleLegacyConnector {

	/**
	 * Creates a new legacy connector instance.
	 * @param {string} serverName - The user-defined name for the server.
	 * @param {string} serverURI - The WebSocket URI (e.g., "ws://localhost:8080").
	 */
	constructor(serverName, serverURI) {
		this.serverName = serverName;
		this.serverURI = serverURI;
		this.webSocket = null; // WebSocket instance
		this.authToken = undefined; // Authentication token received after login
		this.messageSubscribers = []; // List of functions called when a new message arrives
		this.receivedMessages = []; // All messages retrieved since connection start
		this.sentCommands = []; // EXEC Commands sent by the user to this server
		this.connectedPlayers = []; // List of connected players (if provided by server)
		this.isLoggedIn = false; // Flag indicating if the connection is authenticated
		this.connectionVersionType = 0; // Identifier for legacy connection type
	}

	/**
	 * Establishes the WebSocket connection to the server.
	 */
	establishConnection() {
		console.log(`Attempting to connect (Legacy) to: ${this.serverURI}`);
		try {
			this.webSocket = new WebSocket(this.serverURI);
			this.webSocket.onopen = (event) => this.handleWebSocketOpen(event);
			this.webSocket.onclose = (event) => this.handleWebSocketClose(event);
			this.webSocket.onmessage = (event) => this.handleWebSocketMessage(event);
			this.webSocket.onerror = (event) => this.handleWebSocketError(event);
		} catch (error) {
			console.error(`Error establishing WebSocket connection to ${this.serverName} (${this.serverURI}):`, error);
			// Optionally notify the main controller about the connection failure immediately
			handleConnectionClosed(this.serverName, "Connection Error"); // Pass a reason
		}
	}

	/**
	 * Internal handler for the WebSocket 'open' event.
	 * @param {Event} event - The WebSocket open event object.
	 */
	handleWebSocketOpen(event) {
		// Stop reconnection attempts if any were running
		// Assumes `reconnectionIntervalId` is globally accessible or passed appropriately.
		if (typeof reconnectionIntervalId !== 'undefined' && reconnectionIntervalId !== null) {
			clearInterval(reconnectionIntervalId);
			reconnectionIntervalId = null; // Reset the interval ID
		}

		// Hide loading indicator and enable command input
		// Assumes jQuery is available and IDs are correct.
		$("#commandInput").prop("disabled", false);
		$("#sendCommandButton").prop("disabled", false);
		console.log(`WebSocket connection opened successfully for (Legacy) ${this.serverName}`);
		// Note: Authentication (status 401 message) is typically the first step after opening.
	}

	/**
	 * Internal handler for the WebSocket 'close' event.
	 * @param {CloseEvent} event - The WebSocket close event object.
	 */
	handleWebSocketClose(event) {
		// Notify the main controller that the connection was closed.
		// Assumes `handleConnectionClosed` is globally accessible.
		const reason = event.reason || (event.wasClean ? "Clean Close" : `Code ${event.code}`);
		handleConnectionClosed(this.serverName, reason);
		console.log(`WebSocket connection closed for (Legacy) ${this.serverName}. Reason: ${reason}, Code: ${event.code}, Clean: ${event.wasClean}`);
	}

	/**
	 * Internal handler for the WebSocket 'message' event.
	 * Parses incoming messages and notifies subscribers.
	 * @param {MessageEvent} event - The WebSocket message event object.
	 */
	handleWebSocketMessage(event) {
		try {
			const parsedMessage = JSON.parse(event.data);

			// If it's a successful login response (status 200), store the auth token.
			if (parsedMessage.status === 200 && parsedMessage.token) {
				this.authToken = parsedMessage.token;
				$('#loadingmodal').modal('hide');
				this.isLoggedIn = true; // Mark as logged in upon receiving token
				console.log(`Authentication successful for (Legacy) ${this.serverName}. Token received.`);
			} else if (parsedMessage.status === 401) {
				this.isLoggedIn = false; // Explicitly mark as not logged in if auth required
				$('#loadingmodal').modal('hide');
				console.log(`Authentication required for (Legacy) ${this.serverName}.`);
			}

			this.notifySubscribers(parsedMessage); // Notify all subscribers about the new message
			this.receivedMessages.push(parsedMessage); // Store the message locally

		} catch (error) {
			console.error(`Error parsing WebSocket message for (Legacy) ${this.serverName}:`, error, "Raw data:", event.data);
		}
	}

	/**
	 * Internal handler for the WebSocket 'error' event.
	 * @param {Event} event - The WebSocket error event object.
	 */
	handleWebSocketError(event) {
		console.error(`WebSocket error for (Legacy) ${this.serverName}:`, event);
		// The 'close' event will usually follow an error.
		// Consider triggering the close handling logic here if needed,
		// but often it's handled by the subsequent onClose event.
	}

	/**
	 * Sends a structured message (usually a command) to the connected WebSocket server.
	 * The message object will be stringified to JSON before sending.
	 * @param {object} messageObject - The command or message object to send.
	 */
	sendWebSocketMessage(messageObject) {
		if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
			try {
				const messageString = JSON.stringify(messageObject);
				this.webSocket.send(messageString);
				// Log sent commands specifically if they are EXEC type
				if(messageObject.command === "EXEC") {
					this.sentCommands.push(messageObject.params); // Store only the command string
				}
			} catch (error) {
				console.error(`Error sending WebSocket message for (Legacy) ${this.serverName}:`, error, "Message:", messageObject);
			}
		} else {
			console.warn(`WebSocket not open or available for (Legacy) ${this.serverName}. Cannot send message:`, messageObject);
		}
	}

	/**
	 * Notifies all registered subscribers about a newly received message.
	 * @param {object} messageObject - The message object received from the server.
	 */
	notifySubscribers(messageObject) {
		this.messageSubscribers.forEach((callbackFunction) => {
			try {
				callbackFunction(messageObject); // Call the subscriber function with the message
			} catch (error) {
				console.error(`Error in message subscriber for (Legacy) ${this.serverName}:`, error, "Subscriber:", callbackFunction);
			}
		});
	}

	/**
	 * Registers a callback function to be called whenever a message is received.
	 * @param {Function} callbackFunction - The function to add to the subscribers list.
	 */
	addMessageSubscriber(callbackFunction) {
		if (typeof callbackFunction === 'function') {
			this.messageSubscribers.push(callbackFunction);
		} else {
			console.warn(`Attempted to subscribe a non-function for (Legacy) ${this.serverName}.`);
		}
	}

	/**
	 * Removes all registered message subscribers.
	 */
	clearMessageSubscribers() {
		this.messageSubscribers = [];
		console.log(`Cleared message subscribers for (Legacy) ${this.serverName}.`);
	}

	/**
	 * Closes the WebSocket connection cleanly.
	 */
	disconnect() {
		if (this.webSocket) {
			console.log(`Closing WebSocket connection manually for (Legacy) ${this.serverName}.`);
			this.webSocket.close(1000, "Client disconnected"); // 1000 indicates normal closure
		}
		this.isLoggedIn = false;
		this.authToken = undefined;
	}
}