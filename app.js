
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var join = require('path').join;
var os = require('os');

var holla = require('holla');
var io = require('socket.io').listen(8081);

var app = express();

var IP = (function() {
   var iface = os.networkInterfaces().wlp3s0;
   var ip;
   if (iface) {
      iface.forEach(function(connection) {
         if (connection.family === 'IPv4') {
            ip = connection.address;
         }
      });
   }
   return ip;
}());

app.set('ip', process.argv[2] || process.env.IP || IP || '127.0.0.1');
app.set('port', process.argv[3] || process.env.PORT || 8080);

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(join(__dirname, 'public')));
app.use(express.errorHandler());

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server on ' + app.get('ip') + ':' + app.get('port'));
});

var rtc = holla.createServer(server);

	function size(obj) {
		var size = 0;

		for (var key in obj) {
			if (obj.hasOwnProperty(key)){	
				size++;
			}
		}

		return size;
	};

	var names = new Array();

	function fix_things(){
		console.log(names);

		var clients = io.sockets.clients();
	
		//removes old clients that did not trigger disconnect
		var temp = new Array();

		for(x = 0; x < clients.length; x++){
			temp[clients[x].id] = "";
		}

		for (var key in names) {
			if (!temp.hasOwnProperty(key)){	
				console.log("deleting!!!!!!!!!!!!!!!");
				console.log(names, temp);

				delete names[key];
				fix_things();
				return;
			}
		}

		//looks for pairs of people disconnected
		for (var key in names) {
			if(names[key] == ""){
				for (var key2 in names) {
					if(key2 != key && names[key2] == ""){
						console.log("found pair of people disconnected!");
						console.log(names);

						names[key] = key2;
						names[key2] = key;

						io.sockets.socket(key).emit("call", {
							name: key2
						});

						io.sockets.socket(key).emit("ready");

						fix_things();
						return;
					}
				}
			}
		}
	}

	setInterval(fix_things, 500);

	io.sockets.on('connection', function(socket) {
		names[socket.id] = "";

		console.log(socket.id + " connected");

		if(size(names) % 2 == 0){
			var clients = io.sockets.clients();

			names[socket.id] = clients[size(names) - 2].id;
			names[clients[size(names) - 2].id] = socket.id

			console.log(clients[size(names) - 2].id + " call " + socket.id);

			io.sockets.socket(clients[size(names) - 2].id).emit("call", {
				name: socket.id
			});
		}

		console.log("connected");
		console.log(names);

		socket.on('draw', function(data) {
			socket.broadcast.emit('draw', data);
		});

		socket.on('clear', function(data) {
			socket.broadcast.emit('clear', data);
		});

		socket.on("photo", function(data) {
			socket.broadcast.emit("photo", data);
		});
		
		socket.on("sync_photo", function(data) {
			socket.broadcast.emit("sync_photo", data);
		});

		socket.on("sync", function(data) {
			socket.broadcast.emit("sync", data);
		});

		socket.on("desync", function(data) {
			socket.broadcast.emit("desync", data);
		});

		socket.on("sync_photo_position", function(data) {
			io.sockets.emit('sync_photo_position', data);
		});

		socket.on("sync_photo_complete", function(data) {
			socket.broadcast.emit('sync_photo_complete', data);
		});

		socket.on("prepare_photo", function(data) {
			socket.broadcast.emit("prepare_photo", data);
		});

		socket.on("back_video", function(data) {
			socket.broadcast.emit("back_video", data);
		});

      socket.on('show_cursor', function(data) {
         socket.broadcast.emit('show_cursor', data);
      });

		socket.emit("inform_name", {
			name: socket.id
		});

		socket.on("ready", function(){
			var id = setInterval(function(){
				if(names[socket.id]){
					console.log("received ready from: " + socket.id + " sending to:" + names[socket.id]);

					io.sockets.socket(names[socket.id]).emit("ready");
				
					clearInterval(id);
				}
			}, 500);
		});

		socket.on("disconnect", function(){
			var clients = io.sockets.clients();
	
			//console.log(names);

			for(x = 0; x < clients.length; x++){
				if(names[clients[x].id] == socket.id){
					names[clients[x].id] = "";
				}
			}

			for(var key in names){
				if(key == socket.id){
					delete names[key];		
				}
			}

			console.log("disconnected");
			console.log(names);
		});
	});
