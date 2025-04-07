/**
 * WebConsole UI Event Handlers
 * Contains all jQuery-based event listeners for user interactions.
 * https://github.com/mesacarlos
 * 2019-2020 Carlos Mesa under MIT License.
 * Refactored for clarity and Bootstrap 5 compatibility.
 */

// Ensure the DOM is fully loaded before attaching handlers
$(document).ready(function() {
    initializeWebConsole(); // Call initialization function from WebConsole.js

    // --- Modal Related Event Handlers ---

    // "Save and Connect" button within the Add Server Modal (Legacy Tab)
    $("#saveAndConnectServerButton").on('click', handleSaveLegacyServer);

    // "Save and Connect" button within the Add Server Modal (New Server Tab)
    $("#saveAndConnectnewServerButton").on('click', handleSaveNewServer);

    // "Login" button within the Password Modal
    $("#passwordSendButton").on('click', handlePasswordSubmit);

    // Handle form submission (e.g., Enter key) in the Password Modal
    $("#passwordForm").on('submit', function(event) {
        event.preventDefault(); // Prevent default form submission
        handlePasswordSubmit(); // Trigger the same logic as clicking the button
    });

    // Action when the Password Modal is fully hidden (after clicking Login or Close)
    $('#passwordModal').on('hidden.bs.modal', processPasswordModalClose);

    // Action when the "Back to welcome page" button is clicked in the Disconnection Modal
    $("#disconnectionModalWelcomeScreenButton").on('click', function() {
        showWelcomeView(); // Navigate back to the home/welcome screen
    });

    // Action when the Settings link in the navbar is clicked
    $("#settingsLink").on('click', openSettingsModal);

    // Action when settings switches/checkboxes are changed in the Settings Modal
    $("#showDateSettingsSwitch").on('change', handleShowDateSettingChange);
    $("#readLogFileSwitch").on('change', handleReadLogFileSettingChange);


    // --- Command Input and Execution ---

    // "Send" button next to the command input field
    $("#sendCommandButton").on('click', sendCommandFromInput);

    // Handle Enter, Arrow Up, Arrow Down keys in the command input field
    $("#commandInput").on('keyup', handleCommandInputKeyUp);

    // --- Server Management Actions ---

    // "Delete server" button in the server view
    $("#deleteServerButton").on('click', handleDeleteServer);

    // --- Player List Actions ---
    // Delegated event handler for dynamically added player buttons
    $("#playerlist").on('click', '.list-group-item-action', function() {
        handlePlayerSelection(this); // `this` refers to the clicked button
    });

    // "Kick" button for selected player
    $("#kickbtn").on('click', handleKickPlayer);

    // "Message" button for selected player
    $("#msgbtn").on('click', handleMessagePlayer);

    // "Ban" button for selected player
    $("#banbtn").on('click', handleBanPlayer); // Added handler for Ban button

    // --- Server-Wide Actions ---

    // "Broadcast" button
    $("#broadcastbtn").on('click', handleBroadcastMessage);

    // "Restart" button
    $("#restartbtn").on('click', handleRestartServer);

    $("#updatebtn").on('click', handleUpdateServer);

    // --- Navigation ---

    // Navbar Brand link click
    $("#navbarBrandLink").on('click', function(e) {
        e.preventDefault(); // Prevent default link behavior
        showWelcomeView();
    });

    // Navbar "Home" link click
    $("#navbarHomeLink").on('click', function(e) {
        e.preventDefault(); // Prevent default link behavior
        showWelcomeView();
    });

    // --- Utility ---
    // "Load Server from Text" link in the footer/welcome area
    $("#loadServerFromText").on('click', handleLoadServersFromText);

}); // End of $(document).ready


// --- Handler Function Implementations ---

/**
 * Handles saving a legacy server configuration from the modal.
 */
function handleSaveLegacyServer() {
    const addServerForm = document.getElementById("addServerForm");
    const serverNameInput = $("#server-name");
    const serverIpInput = $("#server-ip");
    const serverPortInput = $("#server-port");
    const serverSslCheckbox = $("#server-ssl");

    // Basic HTML5 validation check
    if (!addServerForm.checkValidity()) {
        addServerForm.classList.add('was-validated');
        return;
    }
    addServerForm.classList.remove('was-validated'); // Remove validation classes if valid

    // Sanitize server name (basic prevention of HTML/attribute injection)
    const serverName = serverNameInput.val().replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "").replace(/"/g, "");
    const serverIp = serverIpInput.val() || "localhost"; // Default to localhost if empty
    const serverPort = serverPortInput.val();
    const useSsl = serverSslCheckbox.prop('checked');

    // Construct WebSocket URI
    const protocol = useSsl ? "wss://" : "ws://";
    const serverURI = `${protocol}${serverIp}:${serverPort}`;

    // Save using Persistence Manager
    // Assumes `storageManager` is globally available.
    storageManager.persistLegacyServerConfiguration(new WSServer(serverName, serverURI, 0)); // 0 for legacy type

    // Close the modal (Bootstrap 5 instance needed)
    bootstrap.Modal.getInstance(document.getElementById('addServerModal')).hide();

    // Clear modal form fields
    serverNameInput.val("");
    serverIpInput.val("");
    serverPortInput.val("");
    serverSslCheckbox.prop('checked', location.protocol === 'https:'); // Reset SSL based on page protocol

    // Update the server list dropdown in the UI
    populateServerListDropdown();

    // Automatically connect to the newly added server
    activateServerView(serverName);
}

/**
 * Handles saving a new/redirector server configuration from the modal.
 */
function handleSaveNewServer() {
    const addServerForm = document.getElementById("addnewServerForm");
    const serverNameInput = $("#new-server-name");
    const serverIpInput = $("#new-server-ip");
    const serverPortInput = $("#new-server-port");
    const serverPathInput = $("#new-server-path"); // Path input
    const serverSslCheckbox = $("#new-server-ssl");

    // Basic HTML5 validation check
    if (!addServerForm.checkValidity()) {
        addServerForm.classList.add('was-validated');
        return;
    }
    addServerForm.classList.remove('was-validated');

    // Sanitize server name
    const serverName = serverNameInput.val().replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "").replace(/"/g, "");
    const serverIp = serverIpInput.val() || "localhost";
    const serverPort = serverPortInput.val();
    let serverPath = serverPathInput.val().trim(); // Get and trim path
    const useSsl = serverSslCheckbox.prop('checked');

    // Ensure path starts with a '/' if it's not empty
    if (serverPath && !serverPath.startsWith('/')) {
        serverPath = '/' + serverPath;
    }
    // Ensure path doesn't end with a '/' if it's not just "/"
    if (serverPath.length > 1 && serverPath.endsWith('/')) {
        serverPath = serverPath.slice(0, -1);
    }

    // Construct WebSocket URI including the path
    const protocol = useSsl ? "wss://" : "ws://";
    const serverURI = `${protocol}${serverIp}:${serverPort}${serverPath}`; // Append path

    // Save using Persistence Manager
    // Assumes `storageManager` is globally available.
    storageManager.persistNewServerConfiguration(new WSServer(serverName, serverURI, 1)); // 1 for new type

    // Close the modal
    bootstrap.Modal.getInstance(document.getElementById('addServerModal')).hide();

    // Clear modal form fields
    serverNameInput.val("");
    serverIpInput.val("");
    serverPortInput.val("");
    serverPathInput.val(""); // Clear path input
    serverSslCheckbox.prop('checked', location.protocol === 'https:'); // Reset SSL

    // Update the server list dropdown
    populateServerListDropdown();

    // Automatically connect
    activateServerView(serverName);
}

/**
 * Handles the submission of the password from the password modal.
 */
function handlePasswordSubmit() {
    // The actual password sending is handled by the 'hidden.bs.modal' event listener (processPasswordModalClose)
    // This function primarily ensures the modal can be closed by pressing Enter or clicking Login.
    // Close the modal manually if it's still open (e.g., if Enter was pressed)
    const passwordModalElement = document.getElementById('passwordModal');
    const passwordModalInstance = bootstrap.Modal.getInstance(passwordModalElement);
    if (passwordModalInstance) {
        passwordModalInstance.hide();
    } else {
        // Fallback if instance not found (less likely with BS5)
        $('#passwordModal').modal('hide');
    }
}

/**
 * Processes actions after the password modal is closed.
 * Sends the password to the server and handles the "Remember Password" option.
 */
function processPasswordModalClose() {
    if (!connectorManager.currentConnection) {
        console.warn("Password modal closed, but no active connection found.");
        return;
    }

    const passwordInput = $("#server-pwd");
    const rememberCheckbox = $("#rememberPwdCheckbox");
    const password = passwordInput.val();

    // Send LOGIN command to the active connection
    // Assumes `connectorManager` is globally available.
    connectorManager.sendLoginCommand(password);

    // Handle "Remember Password" checkbox
    if (rememberCheckbox.prop("checked")) {
        const serverName = connectorManager.currentConnection.serverName;
        const serverURI = connectorManager.currentConnection.serverURI;
        const serverVersion = connectorManager.currentConnection.connectionVersionType;

        // Create a temporary server object to update the stored password
        const serverToUpdate = new WSServer(serverName, serverURI, serverVersion);
        serverToUpdate.setPassword(password);

        // Save the updated server config (with password) back to storage
        // Assumes `storageManager` is globally available.
        if (serverVersion === 1) {
            storageManager.persistNewServerConfiguration(serverToUpdate);
        } else {
            storageManager.persistLegacyServerConfiguration(serverToUpdate);
        }
        console.log(`Password saved for server: ${serverName}`);
    }

    // Clear the password input field and reset the checkbox for security/privacy
    passwordInput.val('');
    rememberCheckbox.prop('checked', false);
}

/**
 * Sends the command currently entered in the command input field.
 */
function sendCommandFromInput() {
    const commandInput = $("#commandInput");
    const commandToSend = commandInput.val().trim(); // Get trimmed value

    if (commandToSend && connectorManager.currentConnection) {
        // Assumes `connectorManager` is globally available.
        connectorManager.sendExecuteCommand(commandToSend);
        commandInput.val(''); // Clear the input field after sending
        commandHistoryPosition = -1; // Reset command history navigation index
    } else if (!connectorManager.currentConnection) {
        console.warn("Cannot send command: No active connection.");
        // Optionally provide UI feedback
    }
    // Re-focus the input field for convenience
    commandInput.focus();
}

/**
 * Handles KeyUp events (Enter, Arrow Up, Arrow Down) in the command input field.
 * @param {jQuery.Event} event - The keyup event object.
 */
function handleCommandInputKeyUp(event) {
    const commandInput = $("#commandInput"); // Cache selector

    switch (event.which) {
        case 13: // Enter key
            // Prevent multiple submissions by temporarily disabling
            commandInput.prop("disabled", true);
            sendCommandFromInput();
            // Re-enable the input field (might happen very quickly)
            commandInput.prop("disabled", false);
            commandInput.focus(); // Ensure focus remains
            break;

        case 38: // Arrow Up key (History Previous)
            event.preventDefault(); // Prevent cursor moving to start
            if (connectorManager.currentConnection && connectorManager.currentConnection.sentCommands.length > 0) {
                if (commandHistoryPosition === -1) {
                    // If starting history navigation, begin from the end
                    commandHistoryPosition = connectorManager.currentConnection.sentCommands.length - 1;
                } else if (commandHistoryPosition > 0) {
                    // Move to the previous command if not already at the beginning
                    commandHistoryPosition--;
                }
                // Display the command from history
                commandInput.val(connectorManager.currentConnection.sentCommands[commandHistoryPosition]);
                // Move cursor to end of input
                commandInput[0].setSelectionRange(commandInput.val().length, commandInput.val().length);
            }
            break;

        case 40: // Arrow Down key (History Next)
            event.preventDefault(); // Prevent cursor moving to end
            if (connectorManager.currentConnection && commandHistoryPosition !== -1) {
                if (commandHistoryPosition < connectorManager.currentConnection.sentCommands.length - 1) {
                    // Move to the next command if not at the end
                    commandHistoryPosition++;
                    commandInput.val(connectorManager.currentConnection.sentCommands[commandHistoryPosition]);
                } else {
                    // If at the end of history, clear the input and exit history mode
                    commandHistoryPosition = -1;
                    commandInput.val('');
                }
                // Move cursor to end of input
                commandInput[0].setSelectionRange(commandInput.val().length, commandInput.val().length);
            }
            break;

        case 9: // Tab key (Potential Autocomplete - Placeholder)
            event.preventDefault(); // Prevent default tab behavior (focus change)
            console.log("Tab pressed - Autocomplete not yet implemented.");
            // TODO: Implement player name or command suggestion logic here
            // Example: get current input, find matching player/command, update input value
            break;

        default:
            // Any other key press resets the history navigation index if user starts typing
            if (commandHistoryPosition !== -1 && event.which !== 38 && event.which !== 40) {
                // console.log("Exiting history browse mode.");
                commandHistoryPosition = -1;
            }
            break;
    }
}


/**
 * Handles deleting the currently active server configuration.
 */
function handleDeleteServer() {
    if (!connectorManager.currentConnection) {
        console.warn("Cannot delete server: No active connection.");
        return;
    }

    const serverName = connectorManager.currentConnection.serverName;
    const serverVersion = connectorManager.currentConnection.connectionVersionType;

    // Confirmation dialog
    if (!confirm(`Are you sure you want to delete the server configuration for "${serverName}"?`)) {
        return; // User cancelled
    }

    console.log(`Deleting server: ${serverName} (Type: ${serverVersion === 1 ? 'New' : 'Legacy'})`);

    // 1. Remove subscribers from the connection object (done implicitly by removeConnection)
    // connectorManager.currentConnection.clearMessageSubscribers(); // Not strictly needed here

    // 2. Remove the connection instance from the manager (this also disconnects)
    connectorManager.removeConnection(serverName); // Handles setting currentConnection to null

    // 3. Switch UI back to the welcome/homepage
    showWelcomeView(); // Resets UI state

    // 4. Remove the configuration from localStorage
    // Assumes `storageManager` is globally available.
    if (serverVersion === 1) {
        storageManager.deleteNewServerConfiguration(serverName); // Note: Original code had this deletion disabled
    } else {
        storageManager.deleteLegacyServerConfiguration(serverName);
    }

    // 5. Update the server list dropdown in the UI
    populateServerListDropdown();
}

/**
 * Handles the selection of a player from the player list UI.
 * Toggles the 'active' class on the clicked player button.
 * @param {HTMLElement} clickedButtonElement - The button element that was clicked.
 */
function handlePlayerSelection(clickedButtonElement) {
    const $button = $(clickedButtonElement);
    // Ensure only one player is selected at a time
    $button.siblings().removeClass('active');
    $button.toggleClass('active'); // Toggle selection on the clicked player
}

/**
 * Handles the "Kick" player action.
 */
function handleKickPlayer() {
    const selectedPlayerButton = $("#playerlist .list-group-item.active");

    if (selectedPlayerButton.length === 0) {
        alert("Please select a player from the list first.");
        return;
    }
    if (!connectorManager.currentConnection || !connectorManager.currentConnection.isLoggedIn) {
        alert("Cannot perform action: Not connected or not logged in.");
        return;
    }

    const playerName = selectedPlayerButton.text().trim(); // Get player name from button text

    // Confirmation dialog
    if (!confirm(`Are you sure you want to kick player "${playerName}"?`)) {
        return; // User cancelled
    }

    // Construct and send the kick command
    const command = `kick ${playerName}`;
    console.log(`Sending command: ${command}`);
    // Assumes `connectorManager` is globally available.
    connectorManager.sendExecuteCommand(command);

    // Optionally deselect the player after action
    selectedPlayerButton.removeClass('active');
}

/**
 * Handles the "Message" player action.
 */
function handleMessagePlayer() {
    const selectedPlayerButton = $("#playerlist .list-group-item.active");

    if (selectedPlayerButton.length === 0) {
        alert("Please select a player from the list first.");
        return;
    }
    if (!connectorManager.currentConnection || !connectorManager.currentConnection.isLoggedIn) {
        alert("Cannot perform action: Not connected or not logged in.");
        return;
    }

    const playerName = selectedPlayerButton.text().trim();

    // Prompt user for the message
    const messageToSend = prompt(`Enter the message to send privately to "${playerName}":`);

    if (messageToSend === null || messageToSend.trim() === "") {
        // User cancelled or entered empty message
        return;
    }

    // Construct and send the whisper/message command (adjust command based on server type, e.g., /msg, /tell, /w)
    const command = `w ${playerName} ${messageToSend}`; // Common vanilla command
    console.log(`Sending command: ${command}`);
    // Assumes `connectorManager` is globally available.
    connectorManager.sendExecuteCommand(command);

    // Optionally deselect the player
    selectedPlayerButton.removeClass('active');
}

/**
 * Handles the "Ban" player action.
 */
function handleBanPlayer() {
    const selectedPlayerButton = $("#playerlist .list-group-item.active");

    if (selectedPlayerButton.length === 0) {
        alert("Please select a player from the list first.");
        return;
    }
    if (!connectorManager.currentConnection || !connectorManager.currentConnection.isLoggedIn) {
        alert("Cannot perform action: Not connected or not logged in.");
        return;
    }

    const playerName = selectedPlayerButton.text().trim();

    // Prompt for optional reason
    const banReason = prompt(`Enter a reason for banning "${playerName}" (optional):`);

    // Confirmation dialog
    if (!confirm(`Are you sure you want to ban player "${playerName}"? ${banReason ? `Reason: ${banReason}` : ''}`)) {
        return; // User cancelled
    }

    // Construct and send the ban command
    let command = `ban ${playerName}`;
    if (banReason && banReason.trim() !== "") {
        command += ` ${banReason.trim()}`;
    }
    console.log(`Sending command: ${command}`);
    // Assumes `connectorManager` is globally available.
    connectorManager.sendExecuteCommand(command);

    // Optionally deselect the player
    selectedPlayerButton.removeClass('active');
}


/**
 * Handles the "Broadcast" server action.
 */
function handleBroadcastMessage() {
    if (!connectorManager.currentConnection || !connectorManager.currentConnection.isLoggedIn) {
        alert("Cannot perform action: Not connected or not logged in.");
        return;
    }

    // Prompt user for the message
    const messageToSend = prompt("Enter the message to broadcast to the server:");

    if (messageToSend === null || messageToSend.trim() === "") {
        // User cancelled or entered empty message
        return;
    }

    // Construct and send the broadcast command (adjust command based on server type, e.g., /say, /broadcast, /bc)
    const command = `bc ${messageToSend}`; // Example command
    console.log(`Sending command: ${command}`);
    // Assumes `connectorManager` is globally available.
    connectorManager.sendExecuteCommand(command);
}

/**
 * Handles the "Restart" server action.
 */
function handleRestartServer() {
    if (!connectorManager.currentConnection || !connectorManager.currentConnection.isLoggedIn) {
        alert("Cannot perform action: Not connected or not logged in.");
        return;
    }

    // Confirmation dialog
    if (!confirm("Are you sure you want to restart the server? This will disconnect all players.")) {
        return; // User cancelled
    }

    // Construct and send the restart command (adjust command as needed, e.g., /stop, /restart)
    const command = "restart"; // Example command
    console.log(`Sending command: ${command}`);
    // Assumes `connectorManager` is globally available.
    connectorManager.sendExecuteCommand(command);
    // Note: The connection will likely close after sending this command.
}
function handleUpdateServer() {
    if (!connectorManager.currentConnection || !connectorManager.currentConnection.isLoggedIn) {
        alert("Cannot perform action: Not connected or not logged in.");
        return;
    }
    var version = prompt("Enter the new Url to Update to, leave blank to use latest.")
    if(version === null || version.trim() === "") {
        version = "latest"
    }


    // Construct and send the restart command (adjust command as needed, e.g., /stop, /restart)
    const command =  'updateceleste ' + version; // Example command
    console.log(`Sending command: ${command}`);
    // Assumes `connectorManager` is globally available.
    connectorManager.sendExecuteCommand(command);
}


/**
 * Handles the click on the "Load Server from Text" link.
 * Prompts the user for base64 encoded text and attempts to replace localStorage.
 * WARNING: This is potentially unsafe as it replaces the entire storage content.
 */
function handleLoadServersFromText() {
    if (!confirm("WARNING: This will replace ALL your saved servers and settings with the data from the text. Are you absolutely sure?")) {
        return;
    }

    const base64Text = prompt("Enter the base64 encoded text containing server and settings data:");

    if (base64Text === null || base64Text.trim() === "") {
        alert("No text entered. Operation cancelled.");
        return;
    }

    try {
        // Decode the base64 text
        const decodedJson = atob(base64Text.trim());

        // Validate if it looks like the expected JSON structure (basic check)
        // A more robust validation would parse and check keys/types.
        if (!decodedJson.includes('"servers"') || !decodedJson.includes('"language"')) {
            throw new Error("Decoded text does not appear to be valid WebConsole storage data.");
        }

        // Replace the entire content of the legacy localStorage key
        // WARNING: This overwrites everything (servers, language, settings).
        // It doesn't handle the 'NEWWebConsole' key.
        window.localStorage.setItem(storageManager.legacyStorageKey, decodedJson); // Use the correct key

        alert("Data loaded successfully! Reloading the application to apply changes.");
        // Reload the page to reflect the new localStorage data
        window.location.reload();

    } catch (error) {
        console.error("Error loading data from text:", error);
        alert(`Failed to load data: ${error.message}. Please ensure the text is valid base64 encoded JSON.`);
    }
}


/**
 * Opens the Settings Modal and populates the controls with current settings.
 */
function openSettingsModal() {
    // Assumes `storageManager` is globally available.
    $("#showDateSettingsSwitch").prop("checked", storageManager.retrieveSetting("dateTimePrefix"));
    $("#readLogFileSwitch").prop("checked", storageManager.retrieveSetting("retrieveLogFile"));
    // Note: The modal itself is opened via data-bs-toggle/target attributes in HTML
}

/**
 * Handles changes to the "Show Date/Time" setting switch.
 */
function handleShowDateSettingChange() {
    // Assumes `storageManager` is globally available.
    const isEnabled = $("#showDateSettingsSwitch").is(":checked");
    storageManager.updateSetting("dateTimePrefix", isEnabled);
    console.log(`Setting 'dateTimePrefix' updated to: ${isEnabled}`);
}

/**
 * Handles changes to the "Retrieve Log File" setting switch.
 */
function handleReadLogFileSettingChange() {
    // Assumes `storageManager` is globally available.
    const isEnabled = $("#readLogFileSwitch").is(":checked");
    storageManager.updateSetting("retrieveLogFile", isEnabled);
    console.log(`Setting 'retrieveLogFile' updated to: ${isEnabled}`);
}