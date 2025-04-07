/**
 * WebConsole Language Manager for WebConsole
 * Used to load and apply language strings based on user preference.
 * https://github.com/mesacarlos
 * 2019-2020 Carlos Mesa under MIT License.
 * Refactored for clarity.
 */

// Holds the language strings for the currently selected language.
// Defined globally for access within this file, but primarily used by setLanguage.
let currentLanguageStrings = {};

/**
 * Sets the application language based on the provided locale code.
 * Loads the corresponding language strings and updates the UI elements.
 * @param {string} languageCode - The locale code (e.g., "en_US", "es_ES").
 */
function setLanguage(languageCode) {
	// Save the selected language preference using the persistence manager.
	// Assumes `storageManager` is globally available or accessible.
	storageManager.setLanguagePreference(languageCode);

	// Set locale phrases based on the selected languageCode
	switch (languageCode) {
		case "en_US":
			currentLanguageStrings = {
				"navbarHomeLink": "Home",
				"home_header": "Select a server from the menu",
				"home_description": "Use the navigation bar to add a new Minecraft Server or connect to a previously added one.",
				"serversDropdown": "Your servers",
				"add_server": "Add Server",
				"noServersAdded": "No servers added",
				"lang_dropdown": "Language",
				"addServerModalLongTitle": "Add a new server",
				"add-new-server-page-tab": "New Server", // Added for Tab
				"add-legacy-server-page-tab": "Legacy Server", // Added for Tab
				"addnewServerModalSvName": "Server name:", // Renamed for New Server Tab
				"addnewServerModalSvIp": "Redirector IP:", // Renamed for New Server Tab
				"addnewServerModalSvPort": "Redirector port:", // Renamed for New Server Tab
				"addnewServerpath": "Server Path (Set in Redirector):", // Added for New Server Tab Path
				"addnewServerModalSvSsl": "Redirector is SSL enabled", // Renamed for New Server Tab
				"addServerModalSvName": "Server name:", // Legacy Server Tab
				"addServerModalSvIp": "Server IP:", // Legacy Server Tab
				"addServerModalSvPort": "WebConsole port:", // Legacy Server Tab
				"addServerModalSvSsl": "SSL is enabled on the server", // Legacy Server Tab
				"addServerModalSslAdvice": "SSL is required for connections made from HTTPS websites",
				"addServerModalClose": "Close",
				"saveAndConnectServerButton": "Save and connect", // Legacy Save Button
				"saveAndConnectnewServerButton": "Save and connect", // New Server Save Button
				"passwordModalLongTitle": "Password required",
				"passwordModalLabel": "Password:",
				"passwordModalRememberLabel": "Remember password",
				"passwordModalCloseButton": "Close",
				"passwordSendButton": "Login",
				"disconnectionModalLongTitle": "Disconnected",
				"disconnectionModalDescription": "Connection was lost with the server. This can be caused by:",
				"disconnectionModalsub1": "Server was closed intentionally.",
				"disconnectionModalsub2": "Port is not opened on your host. In this case, troubleshoot using a port checker and recheck your firewall or router.",
				"disconnectionModalCloseButton": "Close",
				"disconnectionModalWelcomeScreenButton": "Back to welcome page",
				"settingsLink": "Settings",
				"settingsModalLongTitle": "WebConsole Settings",
				"showDateSettingsSwitchLabel": "Show time on each console line",
				"readLogFileSwitchLabel": "Retrieve full log file from server after login",
				"settingsModalCloseButton": "Done",
				"players_online": "Players Online",
				"cpu_title": "CPU",
				"ram_title": "RAM usage",
				"tps_title": "TPS", // Added TPS title
				"user_title": "Logged as",
				"deleteServerButton": "Delete server",
				"sendCommandButton": "Send",
				"broadcastbtn": "Broadcast", // Added Server Action Button
				"restartbtn": "Restart", // Added Server Action Button
				"msgbtn": "Message", // Added Player Action Button
				"kickbtn": "Kick", // Added Player Action Button
				"banbtn": "Ban", // Added Player Action Button
			};
			break;
		case "es_ES":
			currentLanguageStrings = {
				"navbarHomeLink": "Inicio",
				"home_header": "Selecciona un servidor del menú",
				"home_description": "Usa la barra superior para añadir un nuevo servidor de Minecraft o para conectarte a un servidor añadido previamente.",
				"serversDropdown": "Tus servidores",
				"add_server": "Añadir Server",
				"noServersAdded": "Ningun servidor guardado",
				"lang_dropdown": "Idioma",
				"addServerModalLongTitle": "Añadir un nuevo servidor",
				"add-new-server-page-tab": "Nuevo Servidor",
				"add-legacy-server-page-tab": "Servidor Heredado",
				"addnewServerModalSvName": "Nombre del servidor:",
				"addnewServerModalSvIp": "IP del Redirector:",
				"addnewServerModalSvPort": "Puerto del Redirector:",
				"addnewServerpath": "Ruta del Servidor (Configurada en Redirector):",
				"addnewServerModalSvSsl": "Redirector tiene SSL activado",
				"addServerModalSvName": "Nombre del servidor:",
				"addServerModalSvIp": "IP del servidor:",
				"addServerModalSvPort": "Puerto WebConsole:",
				"addServerModalSvSsl": "SSL está activado",
				"addServerModalSslAdvice": "Te estás conectando al cliente por HTTPS, por tanto SSL es obligatorio",
				"addServerModalClose": "Cerrar",
				"saveAndConnectServerButton": "Guardar y conectar",
				"saveAndConnectnewServerButton": "Guardar y conectar",
				"passwordModalLongTitle": "Se necesita contraseña",
				"passwordModalLabel": "Contraseña:",
				"passwordModalRememberLabel": "Recordar contraseña",
				"passwordModalCloseButton": "Cerrar",
				"passwordSendButton": "Iniciar sesión",
				"disconnectionModalLongTitle": "Desconectado",
				"disconnectionModalDescription": "Se perdió la conexión con el servidor. Esto puede deberse a:",
				"disconnectionModalsub1": "El servidor se cerró intencionadamente.",
				"disconnectionModalsub2": "El puerto no está abierto en el host. Utiliza un port checker para verificar que el puerto está abierto y comprueba tu firewall o router.",
				"disconnectionModalCloseButton": "Cerrar",
				"disconnectionModalWelcomeScreenButton": "Volver a pagina de inicio",
				"settingsLink": "Configuración",
				"settingsModalLongTitle": "Configuración de WebConsole",
				"showDateSettingsSwitchLabel": "Mostrar hora en cada linea de consola",
				"readLogFileSwitchLabel": "Leer log completo al iniciar sesión",
				"settingsModalCloseButton": "Hecho",
				"players_online": "Jugadores en línea",
				"cpu_title": "CPU",
				"ram_title": "RAM en uso",
				"tps_title": "TPS",
				"user_title": "Iniciado sesion como",
				"deleteServerButton": "Borrar servidor",
				"sendCommandButton": "Enviar",
				"broadcastbtn": "Anunciar",
				"restartbtn": "Reiniciar",
				"msgbtn": "Mensaje",
				"kickbtn": "Expulsar",
				"banbtn": "Bloquear",
			};
			break;
		// ... (Include all other language cases here, similarly structured) ...
		// Ensure all keys added to en_US are also added (and translated) in other languages
		case "ru_RU": //Credit to Stashenko
			currentLanguageStrings = {
				"navbarHomeLink": "Главная",
				"home_header": "Выберите сервер из меню",
				"home_description": "Используйте панель навигации, чтобы добавить новый сервер Minecraft или подключиться к ранее добавленному.",
				"serversDropdown": "Ваши серверы",
				"add_server": "Добавить сервер",
				"noServersAdded": "Серверы не добавлены",
				"lang_dropdown": "Язык",
				"addServerModalLongTitle": "Добавить новый сервер",
				"add-new-server-page-tab": "Новый сервер",
				"add-legacy-server-page-tab": "Старый сервер",
				"addnewServerModalSvName": "Название сервера:",
				"addnewServerModalSvIp": "IP перенаправителя:",
				"addnewServerModalSvPort": "Порт перенаправителя:",
				"addnewServerpath": "Путь к серверу (установлен в перенаправителе):",
				"addnewServerModalSvSsl": "Перенаправитель с поддержкой SSL",
				"addServerModalSvName": "Название сервера:",
				"addServerModalSvIp": "IP сервера:",
				"addServerModalSvPort": "Порт WebConsole:",
				"addServerModalSvSsl": "Сервер с поддержкой SSL",
				"addServerModalSslAdvice": "SSL требуется для клиентских подключений HTTPS",
				"addServerModalClose": "Закрыть",
				"saveAndConnectServerButton": "Сохранить и подключить",
				"saveAndConnectnewServerButton": "Сохранить и подключить",
				"passwordModalLongTitle": "Требуется пароль",
				"passwordModalLabel": "Пароль:",
				"passwordModalRememberLabel": "Запомнить пароль",
				"passwordModalCloseButton": "Закрыть",
				"passwordSendButton": "Войти",
				"disconnectionModalLongTitle": "Отключение!",
				"disconnectionModalDescription": "Было потеряно соединение с сервером. Это может быть вызвано:",
				"disconnectionModalsub1": "Сервер был закрыт намеренно.",
				"disconnectionModalsub2": "Порт не открыт на вашем хосте. В этом случае устраните неполадки с помощью средства проверки портов и еще раз проверьте свой брандмауэр или маршрутизатор.",
				"disconnectionModalCloseButton": "Закрыть",
				"disconnectionModalWelcomeScreenButton": "Вернуться на страницу приветствия",
				"settingsLink": "настройки",
				"settingsModalLongTitle": "настройки WebConsole",
				"showDateSettingsSwitchLabel": "Показать время в каждой строке консоли",
				"readLogFileSwitchLabel": "Получить полный файл журнала с сервера после входа в систему",
				"settingsModalCloseButton": "Выполнено",
				"players_online": "Игроки",
				"cpu_title": "CPU",
				"ram_title": "RAM",
				"tps_title": "TPS",
				"user_title": "Вы вошли как",
				"deleteServerButton": "Удалить сервер",
				"sendCommandButton": "Отправить",
				"broadcastbtn": "Объявить",
				"restartbtn": "Перезапустить",
				"msgbtn": "Сообщение",
				"kickbtn": "Кикнуть",
				"banbtn": "Забанить",
			};
			break;
		// Add pt_BR, zh_CN, ko_KR, fr_FR, cs_CZ, it_IT, nl_NL, de_DE, tr_TR, ja_JA, pl_PL here
		// Make sure to translate the new keys:
		// "add-new-server-page-tab", "add-legacy-server-page-tab",
		// "addnewServerModalSvIp", "addnewServerModalSvPort", "addnewServerpath", "addnewServerModalSvSsl",
		// "saveAndConnectnewServerButton", "tps_title", "broadcastbtn", "restartbtn", "msgbtn", "kickbtn", "banbtn"

		default:
			console.error("Unsupported language code selected:", languageCode);
			// Optionally default to English if the selected language is not found
			if (languageCode !== "en_US") {
				setLanguage("en_US"); // Recursive call with default
				return; // Prevent applying empty strings below
			}
	}

	// Apply the loaded language strings to the UI elements
	jQuery.each(currentLanguageStrings, (elementId, text) => {
		try {
			// Use jQuery to find the element by ID and set its text content
			$("#" + elementId).text(text);
		} catch (error) {
			console.warn(`Could not set text for element with ID '${elementId}'. Error: ${error.message}`);
		}
	});
}