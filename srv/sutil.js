"use strict";
exports.emit = function(sock, cmd, data){
	var wss = exports.wss;
	if (wss && sock.readyState == 1){
		if (!data) data = {};
		data._ = cmd;
		var msg = JSON.stringify(data);
		sock.send(msg);
	}
}
exports.broadcast = function(cmd, data, skip){
	var wss = exports.wss;
	if (wss){
		if (!data) data = {};
		data._ = cmd;
		var msg = JSON.stringify(data);
		wss.clients.forEach(function(sock){
			if (sock.readyState == 1 && sock != skip) sock.send(msg);
		});
	}
}