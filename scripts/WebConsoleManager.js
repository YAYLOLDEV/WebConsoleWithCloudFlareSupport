/**
 WebConsole Manager for WebConsole
 Used to manage active connections
 https://github.com/mesacarlos
 2019-2020 Carlos Mesa under MIT License.
*/
class WebConsoleManager {
	constructor(){
		this.activeConnections = []; //Active Connectors list

	}
	
	/**
	* Loads a existing connection or creates a new one
	*/
	loadConnection(serverName){
		//If a connection is already active, delete all subscribers
		if(this.activeConnection){
			this.activeConnection.removeSubscribers();
		}

		//If not created yet, create it
		var serverObj = new WebConsolePersistenceManager().getServer(serverName);
		this.activeConnection = new WebConsoleConnector(serverObj.serverName, serverObj.serverURI);
		this.activeConnection.connect();
		
		//Save to connections list
		this.activeConnections.push(this.activeConnection);
	}
	
	/**
	* Deletes connection (for example, if a connection was closed by server).
	* Called by WebConsole.js
	*/
	deleteConnection(serverName, deleteFromArrayOnly){
		//Delete from active connection (if it is the active one)
		if(!deleteFromArrayOnly && this.activeConnection.serverName == serverName){
			this.activeConnection = null;
		}
		
		//Delete from array
		var i;
		for (i = 0; i < this.activeConnections.length; i++) { 
			if(this.activeConnections[i].serverName == serverName){
				this.activeConnections.splice(i, 1);
			}
		}
	}
	test(sting) {
		this.activeConnection.sendToServer({
			command: "TPSH",
			token: this.activeConnection.token,
		});
	}
	/**
	* Send password to server
	*/
	sendPassword(pwd){
		this.activeConnection.sendToServer({
			command: "LOGIN",
			params: pwd
		});
	}
	
	/**
	* Send console command to server
	*/
	sendConsoleCmd(cmd){
		this.activeConnection.sendToServer({
			command: "EXEC",
			token: this.activeConnection.token,
			params: cmd
		});

		this.activeConnection.commands.push(cmd);
	}
	
	/**
	* Asks server for CPU, RAM and players info
	*/
	askForInfo(){
		this.activeConnection.sendToServer({
			command: "PLAYERS",
			token: this.activeConnection.token,
		});

		this.activeConnection.sendToServer({
			command: "CPUUSAGE",
			token: this.activeConnection.token,
		});

		this.activeConnection.sendToServer({
			command: "RAMUSAGE",
			token: this.activeConnection.token,
		});
		this.activeConnection.sendToServer({
			command: "TPS",
			token: this.activeConnection.token,
		});
		
	}
}