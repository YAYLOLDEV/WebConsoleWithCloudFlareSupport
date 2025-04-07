/**
 * Represents a WebSocket server configuration.
 */
class WSServer {
	/**
	 * Creates a new WSServer instance.
	 * @param {string} serverName - The user-defined name for the server.
	 * @param {string} serverURI - The WebSocket URI (e.g., "ws://localhost:8080" or "wss://example.com/path").
	 * @param {number} serverVersionType - The type/version of the server connection (e.g., 0 for legacy, 1 for new/redirector).
	 */
	constructor(serverName, serverURI, serverVersionType) {
		this.serverName = serverName;
		this.serverURI = serverURI;
		this.serverVersionType = serverVersionType; // 0 = Legacy, 1 = New/Redirector
		this.serverPassword = undefined; // Initialize password as undefined
	}

	/**
	 * Sets the password for the server configuration (used for remembering passwords).
	 * @param {string} password - The password to store.
	 */
	setPassword(password) {
		this.serverPassword = password;
	}
}