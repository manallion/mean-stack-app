var express=require('express');
var app=express();

var angularjs=require('angularjs');
var app=angularjs();

var mongodb=require('mongodb');
var app=mongodb();

var node=require('node');
var app=node();

app.get('/',function(request,response){
  response.sendFile(__dirname+'/index2.html');
});

var port = process.env.PORT || 8080;

var server=app.listen(port,function(req,res){
    console.log("Catch the action at http://localhost:"+port);
});
