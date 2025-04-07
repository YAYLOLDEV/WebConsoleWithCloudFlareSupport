/**
 * WebConsole Connection Manager for WebConsole
 * Manages active WebSocket connections (both legacy and new types).
 * Provides an interface for interacting with the currently active connection.
 * https://github.com/mesacarlos
 * 2019-2020 Carlos Mesa under MIT License.
 * Refactored for clarity.
 */
class WebConsoleConnectionManager {
	constructor() {
		this.managedConnections = []; // Stores active Connector instances
		this.currentConnection = null; // Reference to the currently focused connection
		// Dependency injection would be cleaner, but using global for now as per original structure
		this.storageMgr = new WebConsolePersistenceManager();
	}

	/**
	 * Retrieves an existing connection or creates and establishes a new one.
	 * Sets the retrieved or created connection as the `currentConnection`.
	 * @param {string} serverName - The name of the server to load or create a connection for.
	 */
	getConnection(serverName) {
		// If a different connection is currently active, clear its subscribers
		// to prevent updates from the old connection appearing in the new view.
		if (this.currentConnection && this.currentConnection.serverName !== serverName) {
			this.currentConnection.clearMessageSubscribers();
			console.log(`Cleared subscribers for previously active connection: ${this.currentConnection.serverName}`);
		}

		// Check if a connection for this serverName already exists in the managed list
		const existingConnection = this.managedConnections.find(conn => conn.serverName === serverName);

		if (existingConnection) {
			console.log(`Loading existing connection for: ${serverName}`);
			this.currentConnection = existingConnection;
			// Re-subscribing might be necessary if the view is re-opened, handled in activateServerView
			return;
		}

		// If no existing connection, retrieve server config and create a new one
		console.log(`No existing connection found for ${serverName}. Attempting to create new connection.`);
		let serverConfig = this.storageMgr.retrieveLegacyServerConfiguration(serverName);
		let ConnectorClass = WebConsoleLegacyConnector;
		let isNewType = false;

		if (!serverConfig) {
			// If not found in legacy, check the new/redirector storage
			serverConfig = this.storageMgr.retrieveNewServerConfiguration(serverName);
			ConnectorClass = WebConsoleNewConnector; // Use the appropriate connector class
			isNewType = true;
		}

		if (!serverConfig) {
			console.error(`Could not find server configuration for "${serverName}" in either storage.`);
			// Handle error appropriately - maybe show a message to the user
			this.currentConnection = null; // Ensure no connection is active
			return; // Stop execution if no config found
		}

		// Create the new connector instance based on the type found
		console.log(`Creating ${isNewType ? 'new/redirector' : 'legacy'} connection for: ${serverName}`);
		this.currentConnection = new ConnectorClass(serverConfig.serverName, serverConfig.serverURI);

		// Add the new connection to the managed list
		this.managedConnections.push(this.currentConnection);

		// Establish the WebSocket connection
		this.currentConnection.establishConnection();
	}

	/**
	 * Removes a connection instance from the managed list.
	 * Optionally disconnects the WebSocket connection first.
	 * Called externally, e.g., when a connection closes or server is deleted.
	 * @param {string} serverName - The name of the server connection to remove.
	 * @param {boolean} [isClosedByServer=false] - If true, indicates the connection was closed remotely, so don't try to close it again.
	 */
	removeConnection(serverName, isClosedByServer = false) {
		const index = this.managedConnections.findIndex(conn => conn.serverName === serverName);

		if (index > -1) {
			const connectionToRemove = this.managedConnections[index];
			console.log(`Removing connection for: ${serverName}`);

			// If the connection being removed is the currently active one, clear the reference.
			if (this.currentConnection && this.currentConnection.serverName === serverName) {
				console.log(`Clearing active connection reference for ${serverName}.`);
				// Don't disconnect if it was already closed by the server
				if (!isClosedByServer) {
					connectionToRemove.disconnect(); // Attempt a clean disconnect
				}
				this.currentConnection = null;
			} else if (!isClosedByServer) {
				// If it's not the active one but needs removal (e.g., user deleted), disconnect it.
				connectionToRemove.disconnect();
			}

			// Remove from the managed connections array
			this.managedConnections.splice(index, 1);
			console.log(`Connection ${serverName} removed from managed list.`);
		} else {
			console.warn(`Attempted to remove a non-existent connection: ${serverName}`);
		}
	}

	/**
	 * Sends the LOGIN command with the provided password to the currently active connection.
	 * @param {string} password - The password to send.
	 */
	sendLoginCommand(password) {
		if (!this.currentConnection) {
			console.error("Cannot send password: No active connection.");
			return;
		}
		console.log(`Sending LOGIN command for ${this.currentConnection.serverName}`);
		this.currentConnection.sendWebSocketMessage({
			command: "LOGIN",
			params: password
		});
	}

	/**
	 * Sends an EXEC command (console command) to the currently active connection.
	 * Requires the connection to be authenticated (have a token).
	 * @param {string} commandString - The console command to execute.
	 */
	sendExecuteCommand(commandString) {
		if (!this.currentConnection) {
			console.error("Cannot send command: No active connection.");
			return;
		}
		if (!this.currentConnection.isLoggedIn || !this.currentConnection.authToken) {
			console.warn(`Cannot send command "${commandString}" for ${this.currentConnection.serverName}: Not logged in or no token.`);
			// Optionally provide user feedback here (e.g., append message to console UI)
			appendMessageToConsoleUI("Error: Not logged in. Cannot send command.", new Date().toLocaleTimeString());
			return;
		}

		console.log(`Sending EXEC command for ${this.currentConnection.serverName}: ${commandString}`);
		this.currentConnection.sendWebSocketMessage({
			command: "EXEC",
			token: this.currentConnection.authToken, // Send the stored token
			params: commandString
		});
		// Note: The command is added to the connector's internal history within sendWebSocketMessage
	}

	/**
	 * Sends requests for server status information (Players, CPU, RAM, TPS)
	 * to the currently active connection. Requires authentication.
	 */
	requestServerStats() {
		if (!this.currentConnection) {
			console.error("Cannot request stats: No active connection.");
			return;
		}
		if (!this.currentConnection.isLoggedIn || !this.currentConnection.authToken) {
			// Don't log spam, the interval will keep trying. Login process should handle this.
			// console.warn(`Cannot request stats for ${this.currentConnection.serverName}: Not logged in.`);
			return;
		}

		// Send commands, assuming the server supports these command names
		this.currentConnection.sendWebSocketMessage({
			command: "PLAYERS",
			token: this.currentConnection.authToken,
		});

		this.currentConnection.sendWebSocketMessage({
			command: "CPUUSAGE",
			token: this.currentConnection.authToken,
		});

		this.currentConnection.sendWebSocketMessage({
			command: "RAMUSAGE",
			token: this.currentConnection.authToken,
		});

		this.currentConnection.sendWebSocketMessage({
			command: "TPS",
			token: this.currentConnection.authToken,
		});
	}

	/**
	 * Sends a request for the full server log file (e.g., latest.log)
	 * to the currently active connection. Requires authentication.
	 */
	requestLogFile() {
		if (!this.currentConnection) {
			console.error("Cannot request log file: No active connection.");
			return;
		}
		if (!this.currentConnection.isLoggedIn || !this.currentConnection.authToken) {
			console.warn(`Cannot request log file for ${this.currentConnection.serverName}: Not logged in.`);
			return;
		}

		console.log(`Requesting log file for ${this.currentConnection.serverName}`);
		this.currentConnection.sendWebSocketMessage({
			command: "READLOGFILE",
			token: this.currentConnection.authToken,
		});
	}

}