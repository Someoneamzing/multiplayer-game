//-------------------------- Define Server Params -------------------------------------
var mongojs = require("mongojs");
var db = mongojs('localhost:27017/myGame',['account','progress']);
const fs = require('fs');

var express = require('express');
var app = express();
var serv = require('http').Server(app);
var GAME = require("./client/js/const");

//Define Proxy
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

//Begin Listening on port 2000
serv.listen(2000);
console.log("Server Started");

//Define the Joined Sockets list
var SOCKET_LIST = {};

//Set debug state
var DEBUG = true;

//------------------------- Emitter Class Define -------------------------------

var Emitter = function(param){
	var self = {
		sprite: 'empty',
		lifeMin: 0,
		lifeMax: 100,
		speedMin: 0,
		speedMax: 10,
		loop: true,
		count: 1,
		time: 2
	};

	if(param){
		self.sprite = param.sprite !== undefined ? param.sprite : self.sprite;
		self.lifeMin = param.lifeMin !== undefined ? param.lifeMin : self.lifeMin;
		self.lifeMax = param.lifeMax !== undefined ? param.lifeMax : self.lifeMax;
		self.speedMin = param.speedMin !== undefined ? param.speedMin : self.speedMin;
		self.speedMax = param.speedMax !== undefined ? param.speedMax : self.speedMax;
		self.loop = param.loop !== undefined ? param.loop : self.loop;
		self.count = param.count !== undefined ? param.count : self.count;
		self.time = param.time !== undefined ? param.time : self.time;
	}

	return self;


}

//-------------------------- Entity Class Define --------------------------------------

var Entity = function(param){
	//Set up base values
	var self = {
		x: 250,
		y: 250,
		w: 16,
		h: 16,
		hsp: 0,
		vsp: 0,
		emitters: {},
		id: "",
		map: 0
	};

	if (param) {
		if (param.id !== undefined) {self.id = param.id} else self.id = Math.random();
		if (param.x !== undefined) {self.x = param.x} else self.x = 250;
		if (param.y !== undefined) {self.y = param.y} else self.y = 250;
		if (param.map !== undefined) {self.map = param.map} else self.map = 0;
	}
	self.getDistance = function(pt){
		return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y, 2));
	}
	//Set up simple update script
	self.update = function(){
		self.updatePosition();
	}
	//Set up simple position update script
	self.updatePosition = function(){
		self.x += self.hsp;
		self.y += self.vsp;
	}

	self.collide = function(type, x, y){
		var checkList = eval(type + '.list');
		var checkX = typeof x != 'undefined'? x : self.x;
		var checkY = typeof y != 'undefined'? y : self.y;
		for (var i in checkList){
			var obj = checkList[i];
			if(self.map == obj.map && ((checkX - self.w/2 > obj.x - obj.w/2 && checkX - self.w/2 < obj.x + obj.w/2) || (checkX + self.w/2 > obj.x - obj.w/2 && checkX + self.w/2 < obj.x + obj.w/2)) && ((checkY - self.h/2 > obj.y - obj.h/2 && checkY - self.h/2 < obj.y + obj.h/2) || (checkY + self.h/2 > obj.y - obj.h/2 && checkY + self.h/2 < obj.y + obj.h/2))){
				return true;
			}
		}
		return false;
	}
	return self;
}

//-------------------------- Bullet Class Define --------------------------------------
var Bullet = function(param){
	var self = Entity(param);
	self.angle = param.angle;
	self.hsp = Math.cos(self.angle/180*Math.PI) * 10;
	self.vsp = Math.sin(self.angle/180*Math.PI) * 10;
	self.parent = param.parent;
	if (param.damage !== undefined) {self.damage = param.damage} else self.damage = 5;
	self.timer = 0;
	if (param.life !== undefined) {self.life = param.life} else {self.life = 100};
	self.toRemove = false;
	var super_update = self.update;
	self.update = function(){
		self.updatePosition();
		if(self.timer++ > self.life)
			self.toRemove = true;
		if(self.collide('Wall')) self.toRemove = true;
		for(var i in Player.list){
			var p = Player.list[i];
			if(self.getDistance(p)<8 && self.parent != p.id && p.alive && self.map === p.map){
				p.health = Math.max(0,p.health+self.damage);
				SOCKET_LIST[p.id].emit('damage');
				var shooter = Player.list[self.parent];
				if (p.health <= 0) {
					p.kill(self.parent);
					if (shooter) shooter.level += 1;
				}
				self.toRemove = true;
			}
		}
		for(var i in Enemy.list){
			var e = Enemy.list[i];
			if(self.getDistance(e) < 8 && self.map == e.map){
				e.health = Math.max(0, e.health + self.damage);
				if (e.health <= 0){
					if(typeof Player.list[self.parent] != 'undefined'){
						Player.list[self.parent].level ++;
					}
				}
				self.toRemove = true;
			}
		}
	}

	self.getInitPack = function(){
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			map: self.map,
			angle: self.angle,
			emitters: self.emitters
		}
	}

	self.getUpdatePack = function(){
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			map: self.map,
			angle: self.angle,
			emitters: self.emitters
		}
	};

	Bullet.list[self.id] = self;

	initPack.bullet.push(self.getInitPack());

	return self;
}

//-------------------------- Item Class Define ----------------------------------------

var Item = function(param){
	var self = Entity(param);
	self.hsp = 0;
	self.vsp = 0;
	self.type = param.type;
	self.count = param.count;
	if (param.pickupDelay !== undefined) {self.pickupDelay = param.pickupDelay} else self.pickupDelay = 120;
	self.update = function(){
		var nearest = Infinity;
		if(self.pickupDelay > 0) self.pickupDelay --;
		self.updatePosition();
		for(var i in Player.list){
			var player = Player.list[i];
			if(self.getDistance(player)<20&&player.alive&&self.pickupDelay<=0){
				nearest = nearest>self.getDistance(player)?player.id:nearest;
			}
		}
		if(nearest!==Infinity){
			var player = Player.list[nearest];
			var res = player.addToInventory(self.type,self.count);
			if(res===true){
				removePack.item.push(self.id);
				delete Item.list[self.id];
			} else self.count = res;
		}
	}

	self.getInitPack = function() {
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			type: self.type,
			count: self.count,
			map: self.map
		}
	}

	self.getUpdatePack = function(){
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			map: self.map,
			type: self.type,
			count: self.count
		}
	}

	Item.list[self.id] = self;

	initPack.item.push(self.getInitPack());

	return self;
}

var Effect = function(param){
	var self = {};
	self.id = Math.random();
	self.x = param.x;
	self.y = param.y;
	self.parent = param.parent;
	self.life = param.life;
	self.type = param.type;
	if (param.health !== undefined){self.health = param.health;}else{self.health=0};
	if (param.mana !== undefined){self.mana = param.mana;}else{self.mana=0};
	self.cost = param.cost;
	self.speed = param.speed;
	self.cooldown = 0;
	self.range = param.range;
	self.map = param.map;

	self.getDistance = function(pt){
		return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y, 2));
	}

	self.update = function(){
		var p = Player.list[self.parent];
		if (self.life-- >= 0 && p.mana >= self.cost){
			if(self.cooldown-- <= 0){
				self.cooldown = self.speed;
				p.mana -= self.cost;
				p.manaCooldown = self.speed*4;
				for(var i in Player.list){
					var player = Player.list[i];
					if (self.getDistance(player) <= self.range) {
						if (player.id != self.parent){
							player.health = Math.min(Math.max(player.health+self.health,0),player.healthMax);
							if (player.health<=0){player.kill(self.parent)};
						} else if (self.health>=0){
							player.health = Math.min(Math.max(player.health+self.health,0),player.healthMax);
						}
						player.mana = Math.min(Math.max(player.mana+self.mana,0),player.manaMax);
					}
				}
			}
		} else {
			removePack.effect.push(self.id);
			delete Effect.list[self.id];
		}
	}

	self.getInitPack = function(){
		return {
			x: self.x,
			y: self.y,
			type: self.type,
			id: self.id,
			map: self.map,
			range: self.range,
			emitters: self.emitters
		}
	}

	Effect.list[self.id] = self;

	initPack.effect.push(self.getInitPack());

	return self;
}

//-------------------------- Player Class Define --------------------------------------

var Player = function(param){
	//Get base values
	var self = Entity(param);
	//Apply unique attributes
	self.user = param.user;
	self.leftRight = 0;
	self.upDown = 0;
	self.moveSpeed = 5;
	self.maxSpeed = 10;
	self.attackButton = false;
	self.useButton = false;
	self.mouseAngle = 0;
	self.health = 20;
	self.healthMax = 20;
	self.armour = 0;
	self.mana = 100;
	self.manaMax = 100;
	self.level = 0;
	self.inventory = [];
	self.activeItem = 0;
	self.helmet = null;
	self.chest = null;
	self.legs = null;
	self.accessory = null;
	self.alive = true;
	self.deathTime = 0;
	self.manaCooldown = 0;
	self.attackCooldown = 0;
	for(var i=0;i<37;i++){
		self.inventory[i]={
			type: null,
			count: 0
		}
	}
	//Define player movement
	self.update = function(){
		var helmet = GAME.ITEM_LIST[GAME.getItemIndexByType(self.helmet >= 0 ? self.inventory[self.helmet] : 'null')].properties;
		var chest = GAME.ITEM_LIST[GAME.getItemIndexByType(self.chest >= 0 ? self.inventory[self.chest] : 'null')].properties;
		var legs = GAME.ITEM_LIST[GAME.getItemIndexByType(self.legs >= 0 ? self.inventory[self.legs] : 'null')].properties;
		self.armour = helmet.armour + chest.armour + legs.armour;
		self.updatePosition()
		if (self.alive) {
			self.attackCooldown --;
			if (typeof GAME.ITEM_LIST[GAME.getItemIndexByType(self.inventory[self.activeItem].type)] != 'undefined'){
				var values = GAME.ITEM_LIST[GAME.getItemIndexByType(self.inventory[self.activeItem].type)];
				if(self.attackButton) {
					switch (values.group) {
						case "spell":
							if(self.mana >= values.properties.mana&&self.attackCooldown <= 0){
								switch (values.properties.origin){
									case "player":
										self.shootBullet({x: self.x, y: self.y, angle: self.mouseAngle+(-90 + Math.random()*180)/values.properties.accuracy, damage: values.properties.health, life: values.properties.life});
										self.mana -= values.properties.mana;
										self.attackCooldown = values.properties.speed;
										self.manaCooldown = values.properties.speed;
										break;

									case "mouse":
										self.castEffect({x: self.mousex, y: self.mousey, type: values.properties.type, health: values.properties.health, life: values.properties.life, cost: values.properties.cost, speed: values.properties.speed, range: values.properties.range});
										self.mana -= values.properties.mana;
										self.attackCooldown = values.properties.life;
										break;

								}
							}
							break;
						case "melee":
							if (self.attackCooldown <= 0) {
								switch (values.properties.origin){
									case "player":
										self.castEffect({x: self.x, y: self.y, type: "heal", health: values.properties.health, life: 2, cost: 0, speed: 2, range: values.properties.range});
										self.attackCooldown = values.properties.speed;
								}
							}
					}
				}
			}
			if(self.manaCooldown--<=0){
				self.mana = Math.min(self.mana + 1,self.manaMax);
			}
		} else {
			self.deathTime --;
			if(self.deathTime<=0){self.respawn()};
		}
	}
	self.updatePosition = function(){
		self.hsp = Math.min((self.leftRight*self.moveSpeed),self.maxSpeed);
		self.vsp = Math.min((self.upDown*self.moveSpeed),self.maxSpeed);

		//Collision
		if (self.collide("Wall", self.x + self.hsp)){
			while(!self.collide('Wall', self.x + Math.sign(self.hsp))){
				self.x += Math.sign(self.hsp);
			}
			self.hsp = 0;
		}
		self.x += self.hsp;

		if (self.collide("Wall", self.x, self.y + self.vsp)){
			while(!self.collide("Wall", self.x, self.y + Math.sign(self.vsp))){
				self.y += Math.sign(self.vsp);
			}
			self.vsp = 0;
		}
		self.y += self.vsp;
	}
	//Define player attacks
	self.shootBullet = function(param){
		Bullet({
			parent: self.id,
			angle: param.angle,
			x: param.x,
			y: param.y,
			damage: param.damage,
			life: param.life,
			map: self.map
		});
	}

	self.castEffect = function(param){
		Effect({
			parent: self.id,
			x: param.x,
			y: param.y,
			life: param.life,
			type: param.type,
			health: param.health,
			cost: param.cost,
			speed: param.speed,
			range: param.range,
			map: self.map
		})
	}

	self.kill = function(killer){
		self.inventory.forEach(function(item, index){
			self.dropFromInventory(index,item.count);
		})
		SOCKET_LIST[self.id].emit("killed",{who: killer});
		self.alive = false;
		self.deathTime = 120;
	}

	self.respawn = function(){
		self.alive = true;
		self.x = 250;
		self.y = 250;
		self.health = self.healthMax;
		SOCKET_LIST[self.id].emit("respawn");
		console.log(self.x,self.y);
	}

	//Define inventory tools
	self.addToInventory = function(type,count){
		console.log(type,count);
		for(var i in self.inventory){
			if(self.inventory[i].type==type&&self.inventory[i].count<65){
				var oldCount = self.inventory[i].count;
				self.inventory[i].count+=Math.min(count,64-self.inventory[i].count);
				count-=Math.min(count,64-oldCount);
				if(count <= 0) return true;
			} else if(self.inventory[i].type==null&&self.inventory[i].count<65){
				self.inventory[i].type=type;
				self.inventory[i].count=Math.min(count,64);
				count-=Math.min(count,64);
				if(count <= 0) return true;
			}
		}
		if(count>0) return count;
	}

	self.dropFromInventory = function(slot, count){
		if (self.inventory[slot].type != null){
			var change = Math.min(count, self.inventory[slot].count)
			self.inventory[slot].count -= change;
			new Item({type: self.inventory[slot].type,count: change,x: self.x,y: self.y});
			if (self.inventory[slot].count <= 0) {
				self.inventory[slot].type = null;
			}
		}
	};

	self.getInitPack = function(){
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			user: self.user,
			mana: self.mana,
			manaMax: self.manaMax,
			health: self.health,
			healthMax: self.healthMax,
			inventory: self.inventory,
			level: self.level,
			map: self.map,
			emitters: self.emitters,
			activeItem: self.activeItem
		}
	}

	self.getUpdatePack = function(){
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			map: self.map,
			mana: self.mana,
			health: self.health,
			inventory: self.inventory,
			level: self.level,
			emitters: self.emitters,
			activeItem: self.activeItem
		}
	}

	//Add self to the list of players
	Player.list[self.id] = self;

	initPack.player.push(self.getInitPack());

	return self;
}

//--------------------------- Enemy Class Define -------------------------------
var Enemy = function(param){
	var self = new Entity(param);
	self.id = typeof param.id != 'undefined' ? param.id : Math.random();
	self.toRemove = false;
	self.health = param.health || 20;
	self.healthMax = param.healthMax || 20;
	self.range = param.range || 100;
	self.looking = self.range;
	self.speed = param.speed || 4;
	self.damage = param.damage || 7;
	self.attackCooldown = param.attackCooldown || 0;
	self.playerTrack = {id: '', dist:self.range};

	self.update = function(){
		self.updatePosition();
		self.hsp = 0;
		self.vsp = 0;
		self.playerTrack = {id: '', dist:self.looking};
		for(var i in Player.list){
			if(self.getDistance(Player.list[i])<self.playerTrack.dist && Player.list[i].alive && Player.list[i].map == self.map) {
				self.playerTrack.id=i;
				self.playerTrack.dist = self.getDistance(Player.list[i]);
			}
		}
		var p = Player.list[self.playerTrack.id];
		if(typeof p != 'undefined'){
			self.looking = 2 * self.range;
			var a = Math.atan2(p.y - self.y, p.x - self.x);
			self.hsp = Math.cos(a)*self.speed;
			self.vsp = Math.sin(a)*self.speed;
			if(self.playerTrack.dist<32 && p.alive && self.map === p.map && self.attackCooldown-- <= 0){
				p.health = Math.max(0,p.health-self.damage);
				self.attackCooldown = 70;
				SOCKET_LIST[p.id].emit('damage');
				if (p.health <= 0) {
					p.kill(self.id);
				}
			}
		} else {
			self.looking = self.range;
		}

		if(self.health <= 0){
			self.toRemove = true;
		}

	}

	self.updatePosition = function(){

		//Collision
		if (self.collide("Wall", self.x + self.hsp)){
			while(!self.collide('Wall', self.x + Math.sign(self.hsp))){
				self.x += Math.sign(self.hsp);
			}
			self.hsp = 0;
		}
		self.x += self.hsp;

		if (self.collide("Wall", self.x, self.y + self.vsp)){
			while(!self.collide("Wall", self.x, self.y + Math.sign(self.vsp))){
				self.y += Math.sign(self.vsp);
			}
			self.vsp = 0;
		}
		self.y += self.vsp;
	}

	self.getInitPack = function(){
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			map: self.map,
			emitters: self.emitters,
			health: self.health,
			healthMax: self.healthMax
		}
	}

	self.getUpdatePack = function(){
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			map: self.map,
			emitters: self.emitters,
			health: self.health
		}
	}

	Enemy.list[self.id] = self;

	initPack.enemy.push(self.getInitPack());

	return self;

}



//------------------------- Teleporter Class Define ----------------------------
var Teleporter = function(param){
	var self = new Entity(param);
	self.id = typeof param.id != 'undefined'? param.id : Math.random();
	self.w = 32;
	self.h = 32;
	self.toX = param.toX;
	self.toY = param.toY;
	self.toMap = param.toMap;

	self.emitters.main = new Emitter({
		sprite: 'particle',
		lifeMin: 5,
		lifeMax: 10,
		speedMin: 1,
		speedMax: 2,
	})
	self.update = function(){
		for(var i in Player.list){
			var player = Player.list[i];
			if (player.getDistance(self)<= 10 && self.map == player.map){
				player.x = self.toX;
				player.y = self.toY;
				player.map = self.toMap;
			}
		}
	}

	self.getInitPack = function(){
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			map: self.map,
			emitters: self.emitters,
			toX: self.toX,
			toY: self.toY,
			toMap: self.toMap
		}
	}

	self.getUpdatePack = function(){
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			map: self.map,
			emitters: self.emitters,
			toX: self.toX,
			toY: self.toY,
			toMap: self.toMap
		}
	}

	Teleporter.list[self.id] = self;

	initPack.teleporter.push(self.getInitPack());

	return self;
}

//---------------------------- Wall Class Define -------------------------------

var Wall = function(param){
	var self = new Entity(param);
	self.id = typeof param.id != 'undefined'? param.id : Math.random();
	self.w = param.w || self.w;
	self.h = param.h || self.h;

	self.getInitPack = function(){
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			w: self.w,
			h: self.h,
			map: self.map
		}
	}

	Wall.list[self.id] = self;

	initPack.wall.push(self.getInitPack())

	return self;
}

//--------------------------- Wall Class Functions -----------------------------
Wall.list = {};

Wall.getAllInitPack = function(){
	var walls = [];
	for (var i in Wall.list) walls.push(Wall.list[i].getInitPack());
	return walls;
}

Wall.remove = function(id){
	if(typeof Wall.list[id] != 'undefined'){
		removePack.wall.push(id);
		delete Wall.list[id];
	}
}

//-------------------------- Bullet Class Functions -----------------------------------

//Define a list for storing existing bullets
Bullet.list = {};

//Define an update script to call the update function on each bullet and add to packet
Bullet.update = function(){

	var pack = [];
	for(var i in Bullet.list){
		var bullet = Bullet.list[i];
		bullet.update();
		if (bullet.toRemove) {
			delete Bullet.list[i];
			removePack.bullet.push(bullet.id);
		}
		else
		pack.push(bullet.getUpdatePack());
	}
	return pack;
}

Bullet.getAllInitPack = function(){
	var bullets = [];
	for(var i in Bullet.list) bullets.push(Bullet.list[i].getInitPack());
	return bullets;
}
Bullet.remove = function(id){
	if(typeof Bullet.list[id] != 'undefined'){
		removePack.bullet.push(id);
		delete Bullet.list[id];
	}
}

//-------------------------- Item Class Functions -------------------------------------

Item.list = {};

Item.update = function(){
	var pack = [];
	for(var i in Item.list){
		var item = Item.list[i];
		item.update();
		pack.push(item.getUpdatePack());
	}
	return pack;
}

Item.getAllInitPack = function(){
	var items = [];
	for(var i in Item.list) items.push(Item.list[i].getInitPack());
	return items;
}

Item.remove = function(id){
	if(typeof Item.list[id] != 'undefined'){
		removePack.item.push(id);
		delete Item.list[id];
	}
}

//-------------------------- Effect Class Functions -----------------------------------
Effect.list = {};

Effect.update = function(){
	for(var i in Effect.list){
		var effect = Effect.list[i];
		effect.update();
	}
}

Effect.getAllInitPack = function(){
	var effects = [];
	for(var i in Effect.list) effects.push(Effect.list[i].getInitPack());
	return effects;
}

Effect.remove = function(id){
	if(typeof Effect.list[id] != 'undefined'){
		removePack.effect.push(id);
		delete Effect.list[id];
	}
}

//------------------------ Teleporter Class Functions --------------------------
Teleporter.list = {};

Teleporter.update = function(){
	var pack = [];
	for(var i in Teleporter.list){
		var tele = Teleporter.list[i];
		tele.update();
		pack.push(tele.getUpdatePack());
	}
	return pack;
}

Teleporter.getAllInitPack = function(){
	var teleporters = [];
	for(var i in Teleporter.list) teleporters.push(Teleporter.list[i].getInitPack());
	return teleporters;
}

Teleporter.remove = function(id){
	if(typeof Teleporter.list[id] != 'undefined'){
		removePack.teleporter.push(id);
		delete Teleporter.list[id];
	}
}

//--------------------------- Enemy Class Functions ----------------------------
Enemy.list = {};

Enemy.update = function(){
	var pack = [];
	for(var i in Enemy.list){
		var enemy = Enemy.list[i];
		enemy.update();
		if(enemy.toRemove){
			removePack.enemy.push(enemy.id);
			delete Enemy.list[enemy.id];
		} else {
			pack.push(enemy.getUpdatePack());
		}
	}
	return pack;
}

Enemy.getAllInitPack = function(){
	var enemies = [];
	for(var i in Enemy.list) enemies.push(Enemy.list[i].getInitPack());
	return enemies;
}

Enemy.remove = function(id){
	if(typeof Enemy.list[id] != 'undefined'){
		removePack.enemy.push(id);
		delete Enemy.list[id];
	}
}

//-------------------------- Player Class Functions -----------------------------------
Player.list = {};

//Base player connection script
Player.onConnect = function(socket, username){
	//Create a player object
	var player = new Player({id: socket.id,user: username});
	Player.list[socket.id] = player;

	console.log("Socket Connection with UUID: " + socket.id);

	socket.emit("init", {
		player: Player.getAllInitPack(),
		bullet: Bullet.getAllInitPack(),
		item: Item.getAllInitPack(),
		effect: Effect.getAllInitPack(),
		teleporter: Teleporter.getAllInitPack(),
		wall: Wall.getAllInitPack(),
		enemy: Enemy.getAllInitPack()
	})

	socket.emit('serverConnect',{
		id: socket.id
	});

	socket.emit('addToChat', '&lt;NODE&gt; ' + process.version)


	//Define event listeners for movement data
	socket.on('keyPress',function(data){
		player.leftRight = data.leftRight;
		player.upDown = data.upDown;
		player.attackButton = data.attackButton;
		player.useButton = data.useButton;
		player.mousex = data.mousex;
		player.mousey = data.mousey;
	});

	//Define event listener for mouse movement
	socket.on('mouseMove',function(data){
		player.mouseAngle = data;
	})

	socket.on("equip", function(data){
		console.log("Equip")
		if(typeof GAME.ITEM_LIST[GAME.getItemIndexByType(player.inventory[data.slot].type)] != 'undefined') var group = GAME.ITEM_LIST[GAME.getItemIndexByType(player.inventory[data.slot].type)].group;
		else var group = 'none';
		console.log(group);
		switch (group){
			case "melee":
			case "spell":
			case "range":
			case 'none':
				console.log("set activeItem to: " + data.slot);
				player.activeItem = data.slot;
				break;
			case "helmet":
				player.helemt = data.slot;
				break;
			case "chest":
				player.chest = data.slot;
				break;
			case "legs":
				player.legs = data.slot;
				break;
			case "accessory":
				player.accessory = data.slot;
				break;
		}
	})

	socket.on('drop', (data) => {
		if (player.inventory[data.slot].type == null) return;
		player.dropFromInventory(data.slot, data.amount == 'all'? player.inventory[data.slot].count : 1);
	})
}

Player.getAllInitPack = function(){
	var players = [];
	for(var i in Player.list) players.push(Player.list[i].getInitPack());
	return players;
}

//Base player disconnect script
Player.onDisconnect = function(socket){
	//Remove player from list of player objects
	removePack.player.push(socket.id);
	delete Player.list[socket.id];
}

//Base player update script
Player.update = function(){
	var pack = [];
	for(var i in Player.list){
		var player = Player.list[i];
		player.update();
		pack.push(player.getUpdatePack());
	}
	return pack;
}

Player.emitUpdate = function(){

		Effect.update();

		var pack = {
			player: Player.update(),
			bullet: Bullet.update(),
			item: Item.update(),
			teleporter: Teleporter.update(),
			enemy: Enemy.update()
		}

		//Update Sockets
		for(var i in SOCKET_LIST){
			var socket = SOCKET_LIST[i];
			socket.emit("init",initPack);
			socket.emit("update",pack);
			socket.emit("remove",removePack);
		}

		//Empty the lists of the created and deleted players, bullets and items
		initPack = {player:[], bullet:[], item:[], effect:[], teleporter:[], wall:[], enemy:[]};
		removePack = {player:[], bullet:[], item:[], effect:[], teleporter:[], wall:[], enemy:[]};
};
//-------------------------- Socket Functions -----------------------------------------

var io = require('socket.io') (serv,{});

var isValidPassword = function(data,cb){
	db.account.find({username: data.username,password: data.password},function(err, res){
		if(res.length > 0){
			cb(true);
		} else cb(false);
	})
}

var isUsernameTaken = function(data,cb){
	db.account.find({username: data.username},function(err, res){
		if(res.length > 0){
			cb(true);
		} else cb(false);
	})
}

var addUser = function(data,cb){
	db.account.insert({username: data.username,password: data.password},function(err){
		cb();
	})
}

var isConnected = function(user){
	for(var i in Player.list){
		var player = Player.list[i]
		if (user == player.user) return true;
	}
	return false;
}

var parseEmitters = function(emitters){
	var list = '';
	for(var i in emitters){
		var emitter = emitters[i];
		list += 'Emitter({sprite: "' + emitter.sprite + '", lifeMin: ' + emitter.lifeMin + ', lifeMax: ' + emitter.lifeMax + ', speedMin: ' + emitter.speedMin + ', speedMax: ' + emitter.speedMax + ', count: ' + emitter.count + ', loop: ' + emitter.loop + ', time: ' + emitter.time + '}), ';
	}

	return list.slice(0,-2);
}

var save = function(filename){
	var text = '';
	for(var i in Wall.list){
		var wall = Wall.list[i];
		text += 'Wall({x: ' + wall.x + ', y: ' + wall.y + ', w: ' + wall.w + ', h: ' + wall.h + ', map: ' + wall.map + ', emitters: [' + parseEmitters(wall.emitters) + ']})\n';
	}
	for(var i in Teleporter.list){
		var tele = Teleporter.list[i];
		text += 'Teleporter({x: ' + tele.x + ', y: ' + tele.y + ', map: ' + tele.map + ', toX: ' + tele.toX + ', toY: ' + tele.toY + ', toMap: ' + tele.toMap + ', emitters: [' + parseEmitters(tele.emitters) + ']})\n';
	}
	for(var i in Enemy.list){
		var enemy = Enemy.list[i];
		text += 'Enemy({x: ' + enemy.x + ', y: ' + enemy.y + ', map: ' + enemy.map + ', health: ' + enemy.health + ', healthMax: ' + enemy.healthMax + ', range: ' + enemy.range + ', damage: ' + enemy.damage + ', speed: ' + enemy.speed + ', emitters: [' + parseEmitters(enemy.emitters) + ']})\n';
	}
	fs.writeFile("server/saves/" + filename.replace(/\.\w+$/gm, '') + '.txt', text, (err)=>{
		if(err) throw err;
		return 'File Saved as ' + filename.replace(/\.\w+$/gm, '') + '.txt';
	})
}

var load = function(filename){
	for(var i in Player.list){
		var p = Player.list[i];
		p.x = 250;
		p.y = 250;
		p.map = 0;
	}
	for(var i in Enemy.list){
		var enemy = Enemy.list[i];
		removePack.enemy.push(enemy.id);
		delete Enemy.list[i];
	}
	for(var i in Teleporter.list){
		var teleporter = Teleporter.list[i];
		removePack.teleporter.push(teleporter.id);
		delete Teleporter.list[i];
	}
	for(var i in Effect.list){
		var effect = Effect.list[i];
		removePack.effect.push(effect.id);
		delete Effect.list[i];
	}
	for(var i in Item.list){
		var item = Item.list[i];
		removePack.item.push(item.id);
		delete Item.list[i];
	}
	for(var i in Bullet.list){
		var bullet = Bullet.list[i];
		removePack.bullet.push(bullet.id);
		delete Bullet.list[i];
	}
	for(var i in Wall.list){
		var wall = Wall.list[i];
		removePack.wall.push(wall.id);
		delete Wall.list[i];
	}
	var data = fs.readFileSync('server/saves/' + filename.replace(/\.\w+$/gm, '') + '.txt', {encoding: 'utf8'}).split('\n');
	for(var i in data){
		eval(data[i]);
	}
}

io.sockets.on('connection', function(socket){
	//Handle an incomming socket
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;
	//Handle sign ins
	socket.on('signIn',function(data){
		isValidPassword(data,function(res){
			if(res && !isConnected(data.username)){
				socket.emit('signInResponse',{
					success:true
				})
				Player.onConnect(socket,data.username);
			} else {
				console.log(data.username, data.password)
				if (res){
					socket.emit('signInResponse',{
						success:false,
						reason: 1
					});
				} else {
					socket.emit('signInResponse',{
						success:false,
						reason: 0
					});
				}
			}
		})
	})

	socket.on('signUp',function(data){
		console.log(data);
		isUsernameTaken(data, function(res){
			if(res){socket.emit('signUpResponse',{
				success:false
			})}
			else {
				addUser(data,function(){
					socket.emit('signUpResponse',{
						success:true
					})
				})
			}
		})
	})


	//Handle a disconnecting socket
	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket)
	})

	//Handle incomming chat msg
	socket.on("chatMsg",function(data){
		var playerName = Player.list[socket.id].user;
		for(var i in SOCKET_LIST){
			SOCKET_LIST[i].emit('addToChat',"<" + playerName + "> " + data);
			console.log("<" + playerName + "> " + data);
		}
	})

	//Handle incomming client commant
	socket.on("serverEval",function(data){
		if (!DEBUG || Player.list[socket.id].user != 'jacob') return;
		data = data.replace(/\@s/g, 'Player.list[' + socket.id + ']');
		try {
			var res = eval(data);
		} catch(err) {
			res = "<span class='chat-error'>Server Evaluation Error: " + err.message + "<span>"
		}
		socket.emit('evalAnswer',res);
	})
});

//-------------------------- Main Loop ------------------------------------------------
var initPack = {player:[], bullet:[], item:[], effect:[], teleporter:[], wall:[], enemy:[]};
var removePack = {player:[], bullet:[], item:[], effect:[], teleporter:[], wall:[], enemy:[]};

setInterval(function(){
	//Update Client Packet
	Player.emitUpdate();

},1000/30)
