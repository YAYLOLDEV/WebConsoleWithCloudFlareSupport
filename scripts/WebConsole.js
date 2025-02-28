/**
 Main JS file for WebConsole.
 https://github.com/mesacarlos
 2019-2020 Carlos Mesa under MIT License.
*/
var mychart = null
/**
 * Global variables
 */
const persistenceManager = new WebConsolePersistenceManager();
const connectionManager = new WebConsoleManager();
let lang;
let autoPasswordCompleted = false; //When true, saved password was used. If a 401 is received, then saved password is not correct
let statusCommandsInterval = -1;
let commandHistoryIndex = -1; //Saves current command history index. -1 when not browsing history.

/**
 * Load list of servers in file servers.json
 * and auto update in next request when file is changed
 */
function readServerList() {
	console.log("Servers.json Not implemented");
}

var curserver = null
	function openServer(serverName){
	curserver = serverName
	//Hide welcome div if user is not in welcome page
	$("#welcomeContainer").hide();
	$("#serverContainer").show();
	
	//Change server name and related info
	$("#serverTitle").text(serverName);
	$("#consoleTextArea").text("");
	$("#commandInput").prop("disabled", false);
	$("#sendCommandButton").prop("disabled", false);
	
	//New server, new variables:
	autoPasswordCompleted = false;
	commandHistoryIndex = -1; //Reset command history index
	
	//Create or retrieve connection
	connectionManager.loadConnection(serverName);
	
	//Load saved messages
	let i;
	const messages = connectionManager.activeConnection.messages;
	for(i = 0; i < messages.length; i++){
		if(messages[i].status !== 401){
			onWebSocketsMessage(messages[i]);
		}
	}
	
	//Subscribe a function
	connectionManager.activeConnection.subscribe(onWebSocketsMessage);
}

function onWebSocketsMessage(message){

	switch (message.status) {
		case 10:
			//Console Output
			writeToWebConsole(message.message, message.time);
			break;
		case 200:
			//LoggedIn
			writeToWebConsole(message.message);

			//Show user and permissions
			$("#loggedUsernameLabel").text(message.username);
			$("#loggedUserTypeLabel").text(message.as);

			//Disable command bar if user is viewer
			if(message.as.toLowerCase() === "viewer"){
				$("#commandInput").prop("disabled", true);
				$("#sendCommandButton").prop("disabled", true);
			}

			//Read log file if enabled
			break;
		case 69:
			writeToWebConsole("Token Authenticated!");
		case 400:
			//Unknown Command
			writeToWebConsole(message.message);
			break;
		case 401:
			//Waiting for login. Show password modal or retrieve password
			const savedPwd = persistenceManager.getServer(connectionManager.activeConnection.serverName).serverPassword;
			if(typeof savedPwd !== "undefined" && !autoPasswordCompleted){
				connectionManager.sendPassword(savedPwd);
				autoPasswordCompleted = true;
			}else{
				$('#passwordModal').modal('show');
			}
			break;
		case 1000:
			//Players
			writePlayerInfo(message.connectedPlayers, message.maxPlayers);
			connectionManager.activeConnection.players = JSON.parse(message.players);
			break;
		case 1001:
			//Cpu Usage
			writeCpuInfo(message.usage);
			break;
		case 1002:
			//RAM Usage
			writeRamInfo(message.free, message.used, message.max);
			break;
		case 1003:
			if(message.hasOwnProperty("tps")){
				writeTpsInfo(Math.round(message.tps), 20);
				break;
			}
			const ctx = document.getElementById('chart').getContext('2d');
			const data = message.tpsh;
			const pdata = message.ph;
    // Create the chart
    myChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: Object.values(data).length}, (_, i) => `Hour ${i + 1}`),
        datasets: [{
          label: 'Tps',
          data: Object.values(data),
          backgroundColor: 'rgba(255, 255, 255, 1)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        },{
			label: 'Players',
			data: Object.values(pdata),
			backgroundColor: 'rgba(255, 255, 255, 1)',
			borderColor: 'rgba(99, 255, 164, 1)',
			borderWidth: 1
		  }]
      },
      options: {
        scales: {
          x: {
            title: {
              display: true,
              text: 'Hour'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Count'
            }
          }
        }
      }
    });
			break;
		default:
			console.log('Unknown server response:');
	}

	//Add interval for Players, CPU and RAM info, if not set
	if(statusCommandsInterval === -1 && message.status !== 401){
		statusCommandsInterval = setInterval(function(){
			connectionManager.askForInfo();
		}, 1000);
	}
}
$('#tpsmodal').on('hidden.bs.modal', function (e) {
	// do something...
	myChart.destroy()
})

function tpsclick(){
	connectionManager.test()

}


/**
* Write to console
*/
function writeToWebConsole(msg, time){

	const isScrolledDown = document.getElementById("consoleTextArea").scrollHeight - document.getElementById("consoleTextArea").scrollTop - 40 === $("#consoleTextArea").height();

	//Write to div, replacing < to &lt; (to avoid XSS) and replacing new line to br.
	msg = msg.replace(/</g, "&lt;");
	msg = msg.replace(/(?:\r\n|\r|\n)/g, "<br>");
	
	//Color filter for Windows (thanks to SuperPykkon)
	msg = msg.replace(/\[38;5;0m/g, "<span style='color: #000000;'>"); //&0 //fixed
	msg = msg.replace(/\[38;5;4m/g, "<span style='color: #0000AA;'>"); //&1 //fixed
	msg = msg.replace(/\[38;5;2m/g, "<span style='color: #00AA00;'>"); //&2 //fixed
	msg = msg.replace(/\[38;5;6m/g, "<span style='color: #00AAAA;'>"); //&3 //fixed
	msg = msg.replace(/\[38;5;9m/g, "<span style='color: #AA0000;'>"); //&4 //fixed
	msg = msg.replace(/\[38;5;1m/g, "<span style='color: #AA0000;'>"); //&4 //fixed
	msg = msg.replace(/\[38;5;5m/g, "<span style='color: #AA00AA;'>"); //&5 //fixed
	msg = msg.replace(/\[38;5;3m/g, "<span style='color: #FFAA00;'>"); //&6 //fixed
	msg = msg.replace(/\[0;37;22m/g, "<span style='color: #AAAAAA;'>"); //&7 //fixed
	msg = msg.replace(/\[38;5;8m/g, "<span style='color: #555555;'>");  //&8 //fixed
	msg = msg.replace(/\[38;5;12m/g, "<span style='color: #5555FF;'>");  //&9 //fixed
	msg = msg.replace(/\[38;5;10m/g, "<span style='color: #55FF55;'>");  //&a //fixed
	msg = msg.replace(/\[38;5;14m/g, "<span style='color: #55FFFF;'>");  //&b //fixed
	msg = msg.replace(/\[0;31;1m/g, "<span style='color: #FF5555;'>");  //&c
	msg = msg.replace(/\[38;5;13m/g, "<span style='color: #FF55FF;'>");  //&d //fixed
	msg = msg.replace(/\[38;5;11m/g, "<span style='color: #FFFF55;'>");  //&e  //fixed
	msg = msg.replace(/\[38;5;15m/g, "<span style='color: #FFFFFF;'>");  //&f //fixed
	msg = msg.replace(/\[0m/g, "</span>");  //&f                                      //fixed
	msg = msg.replace(/\[4m/g, "<span style='text-decoration: underline;'>");  //added
	msg = msg.replace(/\[38;5;7m/g, "<span style='color: #FFFFFF;'>");  //added bold
	msg = msg.replace(/\[3m/g, "</span></span><span style='#FF55FF;'>");  //added  background-color: red;
	
	//TODO
	//BOLD: [38;5;7m
	



	//Color filter for UNIX (This is easier!)
	//span may not be closed every time but browsers will do for ourselves
	msg = msg.replace(/§0/g, "<span style='color: #000000;'>"); //&0
	msg = msg.replace(/§1/g, "<span style='color: #0000AA;'>"); //&1
	msg = msg.replace(/§2/g, "<span style='color: #00AA00;'>"); //&2
	msg = msg.replace(/§3/g, "<span style='color: #00AAAA;'>"); //&3
	msg = msg.replace(/§4/g, "<span style='color: #AA0000;'>"); //&4
	msg = msg.replace(/§5/g, "<span style='color: #AA00AA;'>"); //&5
	msg = msg.replace(/§6/g, "<span style='color: #FFAA00;'>"); //&6
	msg = msg.replace(/§7/g, "<span style='color: #AAAAAA;'>"); //&7
	msg = msg.replace(/§8/g, "<span style='color: #555555;'>"); //&8
	msg = msg.replace(/§9/g, "<span style='color: #5555FF;'>"); //&9
	msg = msg.replace(/§a/g, "<span style='color: #55FF55;'>"); //&a
	msg = msg.replace(/§b/g, "<span style='color: #55FFFF;'>"); //&b
	msg = msg.replace(/§c/g, "<span style='color: #FF5555;'>"); //&c
	msg = msg.replace(/§d/g, "<span style='color: #FF55FF;'>"); //&d
	msg = msg.replace(/§e/g, "<span style='color: #FFFF55;'>"); //&e
	msg = msg.replace(/§f/g, "<span style='color: #FFFFFF;'>"); //&f
	
	msg = msg.replace(/§l/g, "<span style='font-weight:bold;'>"); //&l
	msg = msg.replace(/§m/g, "<span style='text-decoration: line-through;'>"); //&m
	msg = msg.replace(/§n/g, "<span style='text-decoration: underline;'>"); //&n
	msg = msg.replace(/§o/g, "<span style='font-style: italic;'>"); //&o
	
	msg = msg.replace(/§r/g, "</span>");  //&r

	//Append datetime if enabled
	if(persistenceManager.getSetting("dateTimePrefix")){
		if(typeof time !== 'undefined' && time !== null) //if time is present and not null
			msg = "[" + time + "] " + msg;
		else if(typeof time !== 'undefined' && time === null) //if time is present and null
			; //no time (is already printed)
		else
			msg = "[" + new Date().toLocaleTimeString() + "] " + msg;
	}
		
	
	$("#consoleTextArea").append(msg + "<br>");
	
	if(isScrolledDown){
		const textarea = document.getElementById('consoleTextArea');
		textarea.scrollTop = textarea.scrollHeight;
	}
}

/**
* Fill connected players card
*/
function writePlayerInfo(connected, maximum){
	$("#connectedPlayers").text(connected);
	$("#maxPlayers").text(maximum);

	const percent = (connected / maximum) * 100;
	$("#playerProgressBar").width(percent + "%");
}

/**
* Fill CPU info card
*/
function writeCpuInfo(usage){
	$("#cpuInfo").text(usage + "%");
	
	$("#CpuProgressBar").width(usage + "%");
}

/**
* Fill RAM info card
*/
function writeRamInfo(free, used, total){
	$('#loadingmodal').modal('hide');
	$("#usedRam").text(used);
	$("#totalRam").text(total);

	const percent = (used / total) * 100;
	$("#RamProgressBar").width(percent + "%");
}

/**
 * Fill TPS info card
 */
function writeTpsInfo(tps, max){
	if(tps > max) {
		tps = max;
	}
	$("#tps").text(tps);
	$("#maxTps").text(max);

	const percent = (tps / max) * 100;
	$("#TpsProgressBar").width(percent + "%");
}

/**
* Called from WebConsoleConnector only.
*/
function closedConnection(serverName){
	if(connectionManager.activeConnection.serverName === serverName){
		//Disable command input and button
		$("#commandInput").prop("disabled", true);
		$("#sendCommandButton").prop("disabled", true);
		setTimeout(retry,10000)
		//Inform user
		$('#loadingmodal').modal({backdrop: 'static', keyboard: false}, 'show');

	}
	connectionManager.deleteConnection(serverName, true);
}
function retry(){openServer(connectionManager.activeConnection.serverName);}
function rsServer(){
	connectionManager.sendConsoleCmd("restart");

}

/**
* Shows welcome screen
*/
function backToHomepage(){
	//Stop gathering info from server
	clearInterval(statusCommandsInterval);
	statusCommandsInterval = -1;

	//Reset command history index
	commandHistoryIndex = -1;
	
	//Clear all server indicators
	writePlayerInfo(0, 0);
	writeCpuInfo(0);
	writeRamInfo(0, 0, 0);
	
	$("#welcomeContainer").show();
	$("#serverContainer").hide();
}

function dev_opt(){
	data = $('#datanew')
	decodeddata = atob(data.val())
	localStorage.setItem('WebConsole', decodeddata)

}

/**
* Update dropdown with saved server list
*/
function updateServerList(){
	//Delete all servers in dropdown
	$('.servermenuitem').remove();
	
	//Add all servers
	const servers = persistenceManager.getAllServers();
	for(let i = 0; i < servers.length; i++){
		$('#ServerListDropDown').append('<a class="dropdown-item servermenuitem" href="#" onclick="openServer(\'' + servers[i].serverName + '\')">' + servers[i].serverName.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/'/g,"").replace(/"/g,"") + '</a>');
	}
	
	//Show a "no servers" message when no servers are added
	if(servers.length === 0){
		$('#ServerListDropDown').append('<a class="dropdown-item servermenuitem disabled" href="#" id="noServersAdded">No servers added</a>');
	}
}
