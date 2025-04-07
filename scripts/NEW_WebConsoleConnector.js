/**
 * WebConsole Connector (New/Redirector Version) for WebConsole
 * Handles WebSocket connections potentially through a redirector.
 * NOTE: This seems like an alternative or future implementation.
 * Functionality might be similar to the legacy connector but potentially different protocol.
 * https://github.com/mesacarlos
 * 2019-2020 Carlos Mesa under MIT License.
 * Refactored for clarity. Kept separate as per instructions.
 */
class WebConsoleNewConnector { // Renamed class for clarity

	/**
	 * Creates a new connector instance for redirector-based connections.
	 * @param {string} serverName - The user-defined name for the server.
	 * @param {string} serverURI - The WebSocket URI, potentially including a path (e.g., "wss://redirector.com/serverpath").
	 */
	constructor(serverName, serverURI) {
		this.serverName = serverName;
		this.serverURI = serverURI; // May include path for redirector
		// this.serverPath = ""; // Original code had this, seems redundant if included in URI
		this.webSocket = null; // WebSocket instance
		this.authToken = undefined; // Authentication token received after login
		this.messageSubscribers = []; // List of functions called when a new message arrive
		this.receivedMessages = []; // All messages retrieved since connection start
		this.sentCommands = []; // EXEC Commands sent by the user to this server
		this.connectedPlayers = []; // List of connected players (if provided by server)
		this.isLoggedIn = false; // Flag indicating if the connection is authenticated
		this.connectionVersionType = 1; // Identifier for new/redirector connection type
	}

	/**
	 * Establishes the WebSocket connection to the server/redirector.
	 */
	establishConnection() { // Renamed from connect
		console.log(`Attempting to connect (New/Redirector) to: ${this.serverURI}`);
		try {
			this.webSocket = new WebSocket(this.serverURI);
			// Assign event handlers using arrow functions to maintain 'this' context
			this.webSocket.onopen = (event) => this.handleWebSocketOpen(event);
			this.webSocket.onclose = (event) => this.handleWebSocketClose(event);
			this.webSocket.onmessage = (event) => this.handleWebSocketMessage(event);
			this.webSocket.onerror = (event) => this.handleWebSocketError(event);
		} catch (error) {
			console.error(`Error establishing WebSocket connection to ${this.serverName} (${this.serverURI}):`, error);
			handleConnectionClosed(this.serverName, "Connection Error");
		}
	}

	/**
	 * Internal handler for the WebSocket 'open' event.
	 * @param {Event} event - The WebSocket open event object.
	 */
	handleWebSocketOpen(event) { // Renamed from onOpen
		// Stop reconnection attempts if any were running
		// Assumes `reconnectionIntervalId` is globally accessible or passed appropriately.
		if (typeof reconnectionIntervalId !== 'undefined' && reconnectionIntervalId !== null) {
			clearInterval(reconnectionIntervalId);
			reconnectionIntervalId = null; // Reset the interval ID
		}

		// Hide loading indicator and enable command input
		// Assumes jQuery is available and IDs are correct.
		$('#loadingmodal').modal('hide');
		$("#commandInput").prop("disabled", false);
		$("#sendCommandButton").prop("disabled", false);
		console.log(`WebSocket connection opened successfully for (New/Redirector) ${this.serverName}`);
		// Authentication (status 401 message) is likely expected next.
	}

	/**
	 * Internal handler for the WebSocket 'close' event.
	 * @param {CloseEvent} event - The WebSocket close event object.
	 */
	handleWebSocketClose(event) { // Renamed from onClose
		// Notify the main controller that the connection was closed.
		// Assumes `handleConnectionClosed` is globally accessible.
		const reason = event.reason || (event.wasClean ? "Clean Close" : `Code ${event.code}`);
		handleConnectionClosed(this.serverName, reason);
		console.log(`WebSocket connection closed for (New/Redirector) ${this.serverName}. Reason: ${reason}, Code: ${event.code}, Clean: ${event.wasClean}`);
	}

	/**
	 * Internal handler for the WebSocket 'message' event.
	 * Parses incoming messages and notifies subscribers.
	 * @param {MessageEvent} event - The WebSocket message event object.
	 */
	handleWebSocketMessage(event) { // Renamed from onMessage
		try {
			const parsedMessage = JSON.parse(event.data);

			// If it's a successful login response (status 200), store the auth token.
			// NOTE: Protocol might differ in the 'new' version, but assuming it's similar for now.
			if (parsedMessage.status === 200 && parsedMessage.token) {
				$('#loadingmodal').modal('hide');
				this.authToken = parsedMessage.token;
			//	this.isLoggedIn = true; // Mark as logged in
				console.log(`Authentication successful for (New/Redirector) ${this.serverName}. Token received.`);

			} else if (parsedMessage.status === 401) {
				$('#loadingmodal').modal('hide');
				this.isLoggedIn = false; // Explicitly mark as not logged in
				console.log(`Authentication required for (New/Redirector) ${this.serverName}.`);
			}

			this.notifySubscribers(parsedMessage); // Notify all subscribers about the new message
			this.receivedMessages.push(parsedMessage); // Store the message locally
		//	console.log(this.receivedMessages);

		} catch (error) {
			console.error(`Error parsing WebSocket message for (New/Redirector) ${this.serverName}:`, error, "Raw data:", event.data);
		}
	}

	/**
	 * Internal handler for the WebSocket 'error' event.
	 * @param {Event} event - The WebSocket error event object.
	 */
	handleWebSocketError(event) { // Renamed from onError
		console.error(`WebSocket error for (New/Redirector) ${this.serverName}:`, event);
		// The 'close' event typically follows an error.
	}

	/**
	 * Sends a structured message (command) to the connected WebSocket server/redirector.
	 * @param {object} messageObject - The command or message object to send.
	 */
	sendWebSocketMessage(messageObject) { // Renamed from sendToServer
		if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
			try {
				const messageString = JSON.stringify(messageObject);
				this.webSocket.send(messageString);
				// Log sent commands specifically if they are EXEC type
				if(messageObject.command === "EXEC") {
					this.sentCommands.push(messageObject.params); // Store only the command string
				}
			} catch (error) {
				console.error(`Error sending WebSocket message for (New/Redirector) ${this.serverName}:`, error, "Message:", messageObject);
			}
		} else {
			console.warn(`WebSocket not open or available for (New/Redirector) ${this.serverName}. Cannot send message:`, messageObject);
		}
	}

	/**
	 * Notifies all registered subscribers about a newly received message.
	 * @param {object} messageObject - The message object received from the server.
	 */
	notifySubscribers(messageObject) { // Renamed from notify
		this.messageSubscribers.forEach((callbackFunction) => {
			try {
				callbackFunction(messageObject); // Call the subscriber function
			} catch (error) {
				console.error(`Error in message subscriber for (New/Redirector) ${this.serverName}:`, error, "Subscriber:", callbackFunction);
			}
		});
	}

	/**
	 * Registers a callback function to be called whenever a message is received.
	 * @param {Function} callbackFunction - The function to add to the subscribers list.
	 */
	addMessageSubscriber(callbackFunction) { // Renamed from subscribe
		if (typeof callbackFunction === 'function') {
			this.messageSubscribers.push(callbackFunction);
		} else {
			console.warn(`Attempted to subscribe a non-function for (New/Redirector) ${this.serverName}.`);
		}
	}

	/**
	 * Removes all registered message subscribers.
	 */
	clearMessageSubscribers() { // Renamed from removeSubscribers
		this.messageSubscribers = [];
		console.log(`Cleared message subscribers for (New/Redirector) ${this.serverName}.`);
	}

	/**
	 * Closes the WebSocket connection cleanly.
	 */
	disconnect() {
		if (this.webSocket) {
			console.log(`Closing WebSocket connection manually for (New/Redirector) ${this.serverName}.`);
			this.webSocket.close(1000, "Client disconnected"); // 1000 indicates normal closure
		}
		this.isLoggedIn = false;
		this.authToken = undefined;
	}
}