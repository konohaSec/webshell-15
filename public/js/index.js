/* 
* @Author: Administrator
* @Date:   2015-06-01 13:27:01
* @Last Modified by:   Administrator
* @Last Modified time: 2015-06-06 16:55:40

*/

jQuery(function(){
	var url="http://"+location.host;
	var socket = io.connect(url);
	var newline="<p class='editor' contentEditable='true'></p>";
  	var historyList=[];
  	var historyIndex=0;
  	var count=0;
	socket.on("cmd-back-data",function(obj)
	{
		var data=obj.data;
		var cmd=obj.cmd;
		console.log("cmd="+cmd);
		var bak=data.replace(/\s+/gi,"");
		if(bak==""){return}
		if(cmd.match(/cat/gi)){
			historyList=unescape(data).split("\n");
			historyIndex=historyList.length-1;
			return;
		}
		console.log("收到数据:"+data);
		data=data.replace(/\n/gi,"<br/>");
		var html="<p class='show'>"+data+"</p>";
		jQuery(document.body).append(html);
		if(data.match(/(.*?)Do\s+you\s+want\s+to\s+continue\s+\[Y\/n\]\?\s+$/gi)){
			//jQuery(document.body).append(newline);
		}
		if(data.match(/\?\s+$/gi)){
			jQuery(document.body).append(newline);
		}
		jQuery(document.body).scrollTop(1000000000);
		jQuery("p:last").focus();
	});

	socket.on("cmd-history",function(data)
	{
		console.log("|"+data+"|");
		var A=data.split("\n");
		var L=A.length;
		for(var i=0;i<=L-1;i++){
			var cmd=A[i].split(" ")[1];
			historyList.push(cmd);
		}
	});

	socket.on("cmd-back-end",function(data)
	{
		if(jQuery("p:last").html()==""){
			jQuery("p:last").remove();
		}
		jQuery(document.body).append(newline);
		jQuery(document.body).scrollTop(1000000000);
	});

	socket.on("ask-client-continue",function(cmd)
	{
		console.log("收到问询"+cmd);
		var html=jQuery("p:last").html();
		if(html=="&nbsp;"){
			jQuery("p:last").remove();
		}
		var newline="<p class='editor continue'  contentEditable='true'></p>";
		jQuery(document.body).append(newline);
		jQuery(document.body).scrollTop(1000000000);
	});

	jQuery("#login").on("click",function(){
		var ip=jQuery(".login #ip").val();
		var port=jQuery(".login #port").val();
		var username=jQuery(".login #username").val();
		var password=jQuery(".login #password").val();
		var data={
			ip:ip,
			port:port,
			username:username,
			password:password
		};
		jQuery.ajax({
			url:"/login",
			type:"post",
			data:data,
			dataType:"json",
			success:function(res){
				if(res&&res.code==200){
					jQuery("#login-pannel").hide();
					jQuery(".editor").show();
					var userdata=JSON.stringify({
						ip:ip,
						port:port,
						username:username
					});
				    var data={
					   username:username,
					   ip:ip,
					   port:port,
					   cmd:"cat /root/.bash_history"
				   };
				   socket.emit("cmd",data);
			  	   window.localStorage.setItem("userdata",userdata);
				}  
				else
				{
					alert("登陆失败");
				}
			},
			error:function(){
				alert("失败");
			}
		});
	});

	jQuery("#reset").on("click",function(){
		jQuery(".login input").val("");
	});

   jQuery("p:last").focus();
   jQuery(document).on("keyup",function(evt)
   {
	  evt.preventDefault();
	  evt.stopPropagation();
   });
   
  //Do you want to continue [Y/n]?
   jQuery(document).on("keydown",function(evt)
   {
   		if(evt.ctrlKey&&evt.which==67){
   			console.log("关闭命令");
   			socket.emit("exit",{code:67});
   			return;
   		}
		if(evt.which==13)
		{
		   evt.preventDefault();
		   evt.stopPropagation();
		   var Nodes=document.body.childNodes;
		   var L=Nodes.length;
		   var text=jQuery("p:last").text();
		   var bak=text.replace(/\s+/g,"");
		   if(bak==""){return}
		   jQuery("p:last").attr("contentEditable","false");
		   text=text.replace(/^\s+/g,"");
		   text=text.replace(/\s+$/g,"");
		   jQuery("p:last").html(text);
		   var userdata=window.localStorage.getItem("userdata");
		   userdata=JSON.parse(userdata);
		   //console.log(userdata);
		   var data={
			   username:userdata.username,
			   ip:userdata.ip,
			   port:userdata.port,
			   cmd:text
		   };
		   historyList.push(text);
		   historyIndex=historyList.length-1;
		   if(jQuery("p:last").hasClass("continue"))
		   {
		   	   var precmd=jQuery("p:last").attr("cmd");
		   	   data.question=precmd;
			   socket.emit("ask-continue",data);
		   }
		   else
		   {
		   	   if(data=="clear"){
		   	   	 return;
		   	   }
			   socket.emit("cmd",data);
		   }
		   return false;
		}
		if(evt.which==38)
		{
			historyIndex=historyIndex-1;
			var cmd=historyList[historyIndex];
			if(!cmd){return}
			jQuery("p:last").html(cmd);
		}
		if(evt.which==40)
		{
			historyIndex=historyIndex+1;
			var cmd=historyList[historyIndex];
			if(!cmd){return}
			jQuery("p:last").html(cmd);	
		}
   });

   jQuery(document).on("keydown",function(evt)
   {
   	  if(evt.target.nodeName=="HTML"){
   	  	  jQuery("p:last").focus();
   	  }	
   });


   jQuery(document).on("click",function(evt){
   	  if(evt.target.nodeName=="HTML"){
   	  	  jQuery("p:last").focus();
   	  }
   });
});