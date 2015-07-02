var fs = require('fs');
var SSH_Module = require('./controller/ssh');
var socketio=require('socket.io');

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.compress());
// app.use(express.json());
// app.use(express.urlencoded());

app.use(express.bodyParser({      
	uploadDir: __dirname + '/public/upload',      
	keepExtensions: true,      
	limit: '2mb'
}));

//app.use(express.cookieParser('sctalk admin manager'));
//app.use(express.cookieParser());
//app.use(express.session());
app.use(express.cookieParser("huzc"));

app.use(express.session({
	secret: "huzc",
	key: "zhanwei",//cookie name
	cookie: {maxAge: 1000 * 60 * 60 * 24 * 3},
	store: new express.session.MemoryStore()
}));

//http://www.tuicool.com/articles/AbEFrq

app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

app.get('/', function(req,res){
	//res.render("index",{});
	console.log("req.session");
	console.log(req.session);
	res.redirect("/index.html");
});

app.post('/login', function(req,res){
	SSH_Module.Server(req,res);
});

var httpServer=http.createServer(app);

httpServer.listen(app.get('port'), function()
{
	console.log('Express server listening on port ' + app.get('port'));
});

var io = socketio.listen(httpServer);
//io.set('transports', ['xhr-polling']);

io.sockets.on('connection',function(socket)
{
	socket.on("cmd",function(data){
		var cookie=socket.handshake.headers.cookie;
		var List=SSH_Module.cookieParser(cookie);
		var username=List["username"];
		var ip=List["ip"];
		var port=List["port"];
		var SSH=SSH_Module.List[username+"@"+ip+":"+port];
		var cmd=data.cmd;
		if(!cmd){
			console.log("命令不存在");
			return;
		}
		console.log("接受到命令data.cmd="+data.cmd);
		cmd=cmd.replace(/\s+/gi," ");
		if(!SSH_Module)
		{
			console.log("SSH_Module对象不存在");
			return
		}
		if(!SSH){
			console.log("!SSH连接不存在");
			return;
		}
		console.log(cmd);
		SSH_Module.exec(cmd,{
			error:function(err){
				socket.emit("cmd-back-error","command error");
			},
			data:function(str){
				console.log("收到信息，准备发送到浏览器"+str);
				if(cmd.match(/cat/gi)){
					socket.emit("cmd-back-data",{cmd:cmd,data:escape(str)});
					return;	
				}
				socket.emit("cmd-back-data",{cmd:cmd,data:str});
			},
			end:function(){
				socket.emit("cmd-back-end","command end");
			},
			exit:function(exitcode){
				socket.emit("cmd-back-exit","exitcode:"+exitcode);
			}
		},SSH,socket);
	});
	
	socket.on("disconnect",function(data){
		var cookie=socket.handshake.headers.cookie;
		var List=SSH_Module.cookieParser(cookie);
		var username=List["username"];
		var ip=List["ip"];
		var port=List["port"];
		console.log("disconnect "+username+"@"+ip+":"+port);
		var SSH=SSH_Module.List[username+"@"+ip+":"+port];
		if(SSH){
			SSH.end();
			delete SSH_Module.List[username+"@"+ip+":"+port];
		}
	});

	socket.on("exit",function(data){
		var cookie=socket.handshake.headers.cookie;
		var List=SSH_Module.cookieParser(cookie);
		var username=List["username"];
		var ip=List["ip"];
		var port=List["port"];
		var stream=socket["stream"];
		console.log("收到关闭流命令");
		if(stream){
			stream.close();
		}
	});

	socket.on("ask-continue",function(data){
		var stream=socket["cmd"];
		if(stream){
			console.log("收到继续命令"+data.cmd);
			stream.write(data.cmd+"\n");
			setTimeout(function(){
				socket["cmd"]=false;
			},10);
		}
	});
});

