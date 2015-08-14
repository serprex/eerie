#!/bin/node
var sutil = require("./srv/sutil");
var World = require("./srv/World");
var app = require("connect")().
	use(require("compression")()).
	use(require("serve-static")(__dirname, { maxAge: 2626262000 }));
var Globe = new World();
wss = new (require("ws/lib/WebSocketServer"))({server:app.listen(80)});
sutil.wss = wss;
var interval = setInterval(Globe.step.bind(Globe), 50);
var Wall = require("./srv/Wall");
Globe.add(new Wall(2, 3));
Globe.add(new Wall(2, 4));
Globe.add(new Wall(2, 5));
Globe.add(new Wall(3, 6));
wss.on("connection", function(socket){
	socket.meta = {};
	socket.meta.player = Globe.createPlayer();
	socket.on("close", function(){
		Globe.rm(this.meta.player);
	});
	socket.on("message", function(rawdata){
		var data = sutil.parseJSON(rawdata);
		console.log(data);
		if (!data) return;
		console.log(this.meta.player.x, this.meta.player.y);
		if (data._ == "kd") this.meta.player.keys[data.c] = true;
		else if (data._ == "ku") this.meta.player.keys[data.c] = false;
	});
	console.log(Globe.toJSON());
	sutil.emit(socket, "world", Globe.toJSON());
});