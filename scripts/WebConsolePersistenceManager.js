/**
 * WebConsole Persistence Manager for WebConsole
 * Handles saving and retrieving server configurations and user settings
 * using the browser's localStorage.
 * https://github.com/mesacarlos
 * 2019-2020 Carlos Mesa under MIT License.
 * Refactored for clarity.
 */
class WebConsolePersistenceManager {

	constructor() {
		this.legacyStorageKey = "WebConsole";
		this.newStorageKey = "NEWWebConsole"; // Key for the newer server type configurations
	}

	/**
	 * Saves or updates a legacy server configuration into localStorage.
	 * @param {WSServer} serverObject - The server configuration object to save.
	 */
	persistLegacyServerConfiguration(serverObject) {
		// Check if server exists
		let found = false;
		const servers = this.retrieveAllLegacyServerConfigurations();
		for (let i = 0; i < servers.length; i++) {
			if (servers[i].serverName === serverObject.serverName) {
				// Exists, replacing it
				servers[i] = serverObject;
				found = true;
				break; // Exit loop once found
			}
		}

		// Not found, adding it
		if (!found) {
			servers.push(serverObject);
		}

		this.replaceAllLegacyServerConfigurations(servers);
	}

	/**
	 * Saves or updates a new/redirector server configuration into localStorage.
	 * @param {WSServer} serverObject - The server configuration object to save.
	 */
	persistNewServerConfiguration(serverObject) {
		// Check if server exists
		let found = false;
		const servers = this.retrieveAllNewServerConfigurations();
		for (let i = 0; i < servers.length; i++) {
			if (servers[i].serverName === serverObject.serverName) {
				// Exists, replacing it
				servers[i] = serverObject;
				found = true;
				break; // Exit loop once found
			}
		}

		// Not found, adding it
		if (!found) {
			servers.push(serverObject);
		}

		this.replaceAllNewServerConfigurations(servers);
	}


	/**
	 * Deletes a legacy server configuration from localStorage.
	 * @param {string} serverName - The name of the server to delete.
	 */
	deleteLegacyServerConfiguration(serverName) {
		const servers = this.retrieveAllLegacyServerConfigurations();
		// Find the index of the server
		const index = servers.findIndex(server => server.serverName === serverName);

		// Delete it if found
		if (index > -1) {
			servers.splice(index, 1);
			// Save the updated list back to WebStorage
			this.replaceAllLegacyServerConfigurations(servers);
		} else {
			console.warn(`Legacy server configuration "${serverName}" not found for deletion.`);
		}
	}

	/**
	 * Deletes a new/redirector server configuration from localStorage.
	 * NOTE: Original code commented this out. Keeping it commented as per instructions.
	 * @param {string} serverName - The name of the server to delete.
	 */
	deleteNewServerConfiguration(serverName){
		//Find server
		/* var i;
		var index = -1;
		var servers = this.retrieveAllNewServerConfigurations(); // Should use retrieveAllNewServerConfigurations
		for (i = 0; i < servers.length; i++) {
			if(servers[i].serverName == serverName){
				index = i;
			}
		}

		//Delete it
		if(index > -1){
			servers.splice(index, 1);
		}

		//Save to WebStorage
		this.replaceAllNewServerConfigurations(servers); */ // Should use replaceAllNewServerConfigurations
		console.warn("Deletion of 'NEW' server configurations is currently disabled in the code.");
	}

	/**
	 * Retrieves a specific legacy server configuration object by name.
	 * @param {string} serverName - The name of the server to retrieve.
	 * @returns {WSServer|undefined} The server object or undefined if not found.
	 */
	retrieveLegacyServerConfiguration(serverName) {
		const servers = this.retrieveAllLegacyServerConfigurations();
		return servers.find(server => server.serverName === serverName);
	}

	/**
	 * Retrieves a specific new/redirector server configuration object by name.
	 * @param {string} serverName - The name of the server to retrieve.
	 * @returns {WSServer|undefined} The server object or undefined if not found.
	 */
	retrieveNewServerConfiguration(serverName) {
		const servers = this.retrieveAllNewServerConfigurations();
		return servers.find(server => server.serverName === serverName);
	}

	/**
	 * Retrieves all saved legacy server configurations.
	 * @returns {Array<WSServer>} An array of server configuration objects.
	 */
	retrieveAllLegacyServerConfigurations() {
		try {
			const storageData = JSON.parse(window.localStorage.getItem(this.legacyStorageKey) || '{}');
			return storageData.servers || [];
		} catch (e) {
			console.error("Error parsing legacy localStorage data:", e);
			return [];
		}
	}

	/**
	 * Retrieves all saved new/redirector server configurations.
	 * @returns {Array<WSServer>} An array of server configuration objects.
	 */
	retrieveAllNewServerConfigurations() {
		try {
			const storageData = JSON.parse(window.localStorage.getItem(this.newStorageKey) || '{}');
			return storageData.servers || [];
		} catch (e) {
			console.error("Error parsing new localStorage data:", e);
			return [];
		}
	}

	/**
	 * Saves the preferred language code to localStorage.
	 * @param {string} languageCode - The language code (e.g., "en_US").
	 */
	setLanguagePreference(languageCode) {
		try {
			// Retrieve existing data (we store language preference in the legacy key for simplicity)
			const storageData = JSON.parse(window.localStorage.getItem(this.legacyStorageKey) || '{}');
			storageData.language = languageCode;

			// Save back to WebStorage
			window.localStorage.setItem(this.legacyStorageKey, JSON.stringify(storageData));
		} catch (e) {
			console.error("Error saving language preference:", e);
		}
	}

	/**
	 * Retrieves the saved language preference from localStorage.
	 * @returns {string} The saved language code, defaulting to "en_US".
	 */
	getLanguagePreference() {
		try {
			const storageData = JSON.parse(window.localStorage.getItem(this.legacyStorageKey) || '{}');
			return storageData.language || "en_US"; // Default to English
		} catch (e) {
			console.error("Error retrieving language preference:", e);
			return "en_US"; // Default on error
		}
	}

	/**
	 * Initializes the localStorage structure for legacy servers if it doesn't exist.
	 */
	ensureLegacyStorageInitialized() {
		if (window.localStorage.getItem(this.legacyStorageKey) === null) {
			// Create empty object structure
			const storageData = {
				servers: [],
				language: "en_US", // Default language
				settings: {} // Initialize settings object
			};
			// Save to WebStorage
			window.localStorage.setItem(this.legacyStorageKey, JSON.stringify(storageData));
			console.log("Initialized legacy localStorage.");
		}
	}

	/**
	 * Initializes the localStorage structure for new/redirector servers if it doesn't exist.
	 */
	ensureNewStorageInitialized() {
		if (window.localStorage.getItem(this.newStorageKey) === null) {
			// Create empty object structure
			const storageData = {
				servers: [],
				// No language or settings stored here currently
			};
			// Save to WebStorage
			window.localStorage.setItem(this.newStorageKey, JSON.stringify(storageData));
			console.log("Initialized new localStorage.");
		}
	}

	/**
	 * Replaces the entire list of legacy servers in localStorage with the provided list.
	 * @param {Array<WSServer>} newServerList - The new array of server configurations.
	 */
	replaceAllLegacyServerConfigurations(newServerList) {
		try {
			// Retrieve existing data
			const storageData = JSON.parse(window.localStorage.getItem(this.legacyStorageKey) || '{}');
			storageData.servers = newServerList;

			// Save back to WebStorage
			window.localStorage.setItem(this.legacyStorageKey, JSON.stringify(storageData));
		} catch (e) {
			console.error("Error replacing legacy server configurations:", e);
		}
	}

	/**
	 * Replaces the entire list of new/redirector servers in localStorage with the provided list.
	 * @param {Array<WSServer>} newServerList - The new array of server configurations.
	 */
	replaceAllNewServerConfigurations(newServerList) {
		try {
			// Retrieve existing data
			const storageData = JSON.parse(window.localStorage.getItem(this.newStorageKey) || '{}');
			storageData.servers = newServerList;

			// Save back to WebStorage
			window.localStorage.setItem(this.newStorageKey, JSON.stringify(storageData));
		} catch (e) {
			console.error("Error replacing new server configurations:", e);
		}
	}

	/**
	 * Initializes the settings object within localStorage if not defined,
	 * or populates it with new default settings if updating from an older version.
	 */
	initializeSettings() {
		this.ensureLegacyStorageInitialized(); // Settings are stored in the legacy key

		try {
			const storageData = JSON.parse(window.localStorage.getItem(this.legacyStorageKey) || '{}');
			let currentSettings = storageData.settings || {};

			// Define default settings. Add new settings here.
			const defaultSettings = {
				dateTimePrefix: new Setting("dateTimePrefix", true),
				retrieveLogFile: new Setting("retrieveLogFile", true)
			};

			// Ensure all default settings exist in the current settings, adding them if missing.
			let settingsUpdated = false;
			jQuery.each(defaultSettings, (key, settingDefinition) => {
				if (!currentSettings.hasOwnProperty(settingDefinition.name)) {
					currentSettings[settingDefinition.name] = settingDefinition.defaultValue;
					settingsUpdated = true;
				}
			});

			// Save back if any settings were added
			if (settingsUpdated) {
				storageData.settings = currentSettings;
				window.localStorage.setItem(this.legacyStorageKey, JSON.stringify(storageData));
				console.log("Initialized/Updated settings in localStorage.");
			}
		} catch (e) {
			console.error("Error initializing settings:", e);
		}
	}

	/**
	 * Updates the value of a specific setting in localStorage.
	 * @param {string} settingName - The name of the setting to update.
	 * @param {*} value - The new value for the setting.
	 */
	updateSetting(settingName, value) {
		try {
			const storageData = JSON.parse(window.localStorage.getItem(this.legacyStorageKey) || '{}');
			if (!storageData.settings) {
				storageData.settings = {}; // Initialize if missing
			}
			storageData.settings[settingName] = value;

			// Save back
			window.localStorage.setItem(this.legacyStorageKey, JSON.stringify(storageData));
		} catch (e) {
			console.error(`Error updating setting "${settingName}":`, e);
		}
	}

	/**
	 * Retrieves the value of a specific setting from localStorage.
	 * @param {string} settingName - The name of the setting to retrieve.
	 * @returns {*} The value of the setting, or undefined if not found or on error.
	 */
	retrieveSetting(settingName) {
		try {
			const storageData = JSON.parse(window.localStorage.getItem(this.legacyStorageKey) || '{}');
			return storageData.settings ? storageData.settings[settingName] : undefined;
		} catch (e) {
			console.error(`Error retrieving setting "${settingName}":`, e);
			return undefined;
		}
	}

}