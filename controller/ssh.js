/* 
* @Author: Administrator
* @Date:   2015-06-03 09:36:53
* @Last Modified by:   Administrator
* @Last Modified time: 2015-06-06 14:40:53
http://blog.chinaunix.net/uid-23399063-id-70131.html
【码农】北京－Achilles(29196159)  23:38:13
*/
var SSHClient = require('ssh2').Client;
var net = require('net');

var SSH_Module=function(){
	var self=this;
	this.List={};
	this.init=function(SSH){
		this.exec("ls",{},SSH);
	}

	this.cookieParser=function(str){
		var A=str.split("; ");
		var List={};
		var L=A.length;
		for(var i=0;i<=L-1;i++){
			var B=A[i].split("=");
			List[B[0]]=B[1];
		}
		return List;
	}

	this.exec=function(cmd,obj,SSH,socket){
		SSH.exec(cmd, {pty:true}, function(err, stream) {
			if(err){
			   console.log('FIRST :: exec error: ' + err);
			   obj.error&&obj.error(err);
			   return SSH.end();
			}
			stream.on("data",function(data){
				var str=data.toString();
				obj.data&&obj.data(str);
				console.log(cmd+":"+str);
				socket["stream"]=stream;
				str=str.replace(/\s+$/gi,"");
				if(str.match(/\?$/gi)){
					socket["cmd"]=stream;
					socket.emit("ask-client-continue",cmd);
				}
			});

			stream.stderr.on('data', function(data) {
				console.log('STDERR: ' + data);
			});

			stream.on("end",function(){
				console.log("end");
				obj.end&&obj.end();
			});

			stream.on("close",function(code, signal){
				console.log(code,signal);
				obj.close&&obj.close();
			});

			stream.on("exit",function(exitcode){
				console.log("exit",exitcode);
				obj.exit&&obj.exit(exitcode);
			});

			stream.on("continue",function(){
				console.log("stream continue");
			});
		});
	}

	this.Server=function(req,res){
		var ip=req.body.ip;
		var port=req.body.port;
		var username=req.body.username;
		var password=req.body.password;
		if(!username||!password||!ip||!port){
			res.send({code:500,msg:"登陆失败"});
			return;
		}
		if(self.List[username+"@"+ip+":"+port]){
			var SSH=self.List[username+"@"+ip+":"+port];
			console.log("存在SSH");
			SSH.end();
		}
		var SSH = new SSHClient();
		self.List[username+"@"+ip+":"+port]=SSH;

		SSH.on('ready', function() {
			req.session.username=username;
			res.cookie("username",username);
			res.cookie("ip",ip);
			res.cookie("port",port);
			self.List[username+"@"+ip+":"+port]=SSH;
			res.send({code:200,msg:"登陆成功",data:SSH.cmdList});
		});
		
		SSH.on('tcp connection', function(info, accept, reject) {
			console.log('TCP :: INCOMING CONNECTION:');
			console.dir(info);

			accept().on('close', function() 
			{
			  console.log('TCP :: CLOSED');
			});

			accept().on('data', function(data) {
				console.log('TCP :: DATA: ' + data);
			});

			accept().end([
				'HTTP/1.1 404 Not Found',
				'Date: Thu, 15 Nov 2012 02:07:58 GMT',
				'Server: ForwardedConnection',
				'Content-Length: 0',
				'Connection: close'
			].join('\r\n'));
		});

		SSH.on("keyboard-interactive",function(name,instructions,instructionsLang,prompts,finish){
			console.log('keyboard-interactive');
		});

		SSH.on("change password",function(message,language){
			console.log('change password');
		});

		SSH.on("continue",function(){
			console.log("SSH continue");
		});

		SSH.on("error",function(){
			console.log("SSH error");
			res.send({code:500,msg:"登陆失败"});
		});

		SSH.on("end",function(){
			console.log("SSH end");
		});

		SSH.on("close",function(code,signal){
			console.log("SSH close");
		});

		SSH.connect({
			host: ip,
			username: username,
			password: password
		});
	}
}

module.exports = new SSH_Module();