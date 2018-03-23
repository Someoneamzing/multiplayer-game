var socket = io();

//-------------------------------------------GAME---------------------------------------------
var right = 0;
var left = 0;
var up = 0;
var down = 0;
var leftRight = 0;
var upDown = 0;
var attackButton = 0;
var useButton = 0;
var x = 0;
var y = 0;
var id = 0;
var mousex = 250;
var mousey = 250;
var mouseAngle = 250;
var inventorySelected = 0;
var damageTime = 0;
var EDIT_RECT = {x: 0, y: 0, w: 20, h: 20};
var EditOn = -1;
var EditHB = 0;
var EditHS = 0;
var EditWB = 0;
var EditWS = 0;
var EditR = 0;
var EditL = 0;
var EditD = 0
var EditU = 0;
var EditLR = 0;
var EditUD = 0;
var EditWBS = 0;
var EditHBS = 0;
var EditO = 1;
var EditOStep = 0.05;
var removeRect = false;
var CAM_DIST = 100;
var MAP_ZOOM = 13;
GAME.sprites = [];

//Create a list for loaded sprites (empty at start)
var Sprites = {};

function isFunction(functionToCheck) {
 var getType = {};
 return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

var overlap = function(list, x, y){
  for(var i in list){
    var obj = list[i];
    if(Players[id].map == obj.map && ((x > obj.x - obj.w/2 && x < obj.x + obj.w/2) || (x > obj.x - obj.w/2 && x < obj.x + obj.w/2)) && ((y > obj.y - obj.h/2 && y < obj.y + obj.h/2) || (y > obj.y - obj.h/2 && y < obj.y + obj.h/2))){
      return obj;
    }
  }
  return false;
}

Sprites.backgrounds = {};
Sprites.backgrounds.update = function(){
	for(var j in Sprites.backgrounds){
		if (!isFunction(Sprites.backgrounds[j]))
		Sprites.backgrounds[j].update();
	};
}

Sprites.effects = {};
Sprites.effects.update = function(){
  for(var j in Sprites.effects){
    if (!isFunction(Sprites.effects[j])) Sprites.effects[j].update();
  }
}

//Create lists for all loaded players, bullets and items
var Players = {};
var Bullets = {};
var Items = {};
var Effects = {};
var Particles = {};
var Teleporters = {};
var Walls = {};
var Enemies = {};

//Load game listeners as soon as the page loads
$(document).ready(function(){
  var gc = document.getElementById("gc");
  var mc = document.getElementById('mc');
  var ic = document.getElementById("inventory-item-icon");
  var pc = document.getElementById("inventory-player-icon");

  ic.width = GAME.UI.inventoryIconSize;
  ic.height = GAME.UI.inventoryIconSize;
  pc.width = GAME.UI.inventoryIconSize;
  pc.height = GAME.UI.inventoryIconSize;

  // $("#inventory-player-icon").css({
  //   "padding-top":  GAME.UI.inventoryInfoPadding + "px",
  //   "margin-left": "auto",
  //   "margin-right": "auto",
  //   "background-color": GAME.UI.inventoryBorderColour
  // })
  //
  // $("#inventory-player-stats").css({
  //   "position": "absolute",
  //   "bottom": "0",
  //   "height": GAME.UI.inventoryPlayerStatsH + "px",
  //   "border-top": "2px solid " + GAME.UI.inventoryBorderColour
  // })

	//Grab the gc context
	var gamectx = document.getElementById("gc").getContext('2d');
  var itemctx = document.getElementById("inventory-item-icon").getContext('2d');
  var playerctx = document.getElementById("inventory-player-icon").getContext('2d');
  var mapctx = document.getElementById("mc").getContext('2d');

	//Set up vars for the chat and inventory elements
	var chatText = $("#chat-text");
	var chatInput = $("#chat-input");
	var chatForm = $("#chat-form");

	var inventory = $("#inventory-div");
	var inventoryUl = $("#inventory-div ul");
	//Auto populate the inventory list with li elements for the max no. of slots
	for(var i=0;i<37;i++){
		inventoryUl.append("<li></li>")
	}
	var inventoryList = $("#inventory-div ul li");

	//Resize the game canvas to the window
	gc.height = window.innerHeight;
	gc.width = window.innerWidth;
  // mc.height = document.getElementById('mc').height;
  // mc.width = document.getElementById('mc').width;
	$(window).resize(function(){
		gc.height = window.innerHeight;
		gc.width = window.innerWidth;
	})



  //Handle Emitters ------------------------------------------------------------
  var Particle = function(options){
    var self = {};
    self.sprite = options.sprite;
    self.map = options.map;
    self.id = options.id;
    self.x = options.x;
    self.y = options.y;
    self.hsp = options.hsp;
    self.vsp = options.vsp;
    self.life = options.life;

    self.render = function(){
      self.x += self.vsp;
      self.y += self.hsp;
      if (self.life -- > 0){
        self.sprite.render(self.x - x + gc.width/2,self.y - y + gc.height/2);
      } else {
        delete Particles[self.id];
      }
    }

    return self;
  }


  function runEmitters(obj){
    for(var i in obj.emitters){
      var emitter = obj.emitters[i];
      if (Players[id].map !== obj.map) return;
      var idPart = Math.random();
      var speed = Math.random() * (emitter.speedMax - emitter.speedMin) + emitter.speedMin;
      var a = Math.random() * (2*Math.PI);
      var life = Math.random() * (emitter.lifeMax - emitter.lifeMin) + emitter.lifeMin;
      Particles[idPart] = new Particle({
        id: idPart,
        x: obj.x,
        y: obj.y,
        hsp: Math.cos(a) * speed,
        vsp: Math.sin(a) * speed,
        life: life,
        sprite: Sprites[emitter.sprite],
        map: obj.map
      })
    }
  }

	//Define the Sprite Class
	var Sprite = function(options){
		var self = {};

		self.name = options.name;
		self.id = options.id;
		self.width = options.width;
		self.height = options.height;
		self.image = options.image;
		if (options.frameIndex !== undefined) {self.frameIndex = options.frameIndex} else {self.frameIndex = 0;};
		self.frameTime = options.frameTime;
		self.tickCount = 0;
		self.frameCount = options.frameCount || 1;
		self.loop = options.loop;

		self.render = function(px, py, w, h, a, index){
      if (typeof w != "undefined"){var width = w}else{var width = self.width};
      if (typeof h != "undefined"){var height = h}else{var height = self.height};
      if (typeof a != "undefined"){var angle = a} else {var angle = 0};
      gamectx.save()
      if (index === false || index === undefined) {
        gamectx.translate(px,py)
        gamectx.rotate(angle*Math.PI/180);
			  gamectx.drawImage(self.image,self.frameIndex*self.width,0,self.width,self.height,-width/2,-height/2,width,height);
      } else {
        gamectx.translate(px,py)
        gamectx.rotate(angle*Math.PI/180);
        gamectx.drawImage(self.image,index*self.width,0,self.width,self.height,-width/2,-height/2,width,height);
      }
      gamectx.restore();
		}

		self.update = function(){
      if (self.loop) {
  			self.tickCount += 1;
  			if (self.tickCount > self.frameTime){
  				self.tickCount = 0;
  				if(self.frameIndex<self.frameCount-1){
  					self.frameIndex ++;
  				} else {
  					self.frameIndex = 0;
  				};
  			}
      }
		}
		return self;
	}

	//Define the Player Class
	var Player = function(initPack) {
		var self = {};
		self.id = initPack.id;
		self.user = initPack.user;
		self.x = initPack.x;
		self.y = initPack.y;
    self.emitters = initPack.emitters;
		self.mana = initPack.mana;
    self.manaMax = initPack.manaMax;
		self.health = initPack.health;
		self.healthMax = initPack.healthMax;
		self.inventory = initPack.inventory;
		self.level = initPack.level;
		self.map = initPack.map;
    self.activeItem = initPack.activeItem;

		if (self.id == id) {
			x = self.x;
			y = self.y;
			self.inventory.forEach(function(item,index){
        if (item.count > 0) {
          inventoryList[index].innerHTML = "(" + item.count + ") " + item.type;
        } else {
				  inventoryList[index].innerHTML = "Empty";
        }
			})
		}

		self.render = function() {
			if (Players[id].map !== self.map) return;
			if (self.id != id) {
				gamectx.fillStyle = "white";
				gamectx.fillText(self.user, self.x - x + gc.width/2, self.y - y + gc.height/2 - GAME.UI.nameOffsetY);
				gamectx.fillStyle = "red";
				gamectx.fillRect(self.x - x + gc.width/2-25, self.y - y + gc.height/2-20,50,10);
				gamectx.fillStyle = "lime";
				gamectx.fillRect(self.x - x + gc.width/2-25, self.y - y + gc.height/2-20,(50*(self.health/self.healthMax)),10);
				gamectx.fillStyle = "white";
				gamectx.fillText(self.level,self.x - x + gc.width/2,self.y - y + gc.height/2 - 25);
				Sprites.player.render(self.x - x + gc.width/2,self.y - y + gc.height/2);
        mapctx.fillStyle = '#0066ff';
        // mapctx.beginPath();
        // mapctx.arc(self.x/(10)+(mapctx.width/2), self.y/(10)+(mapctx.height/2), 10, 0, 2*Math.PI);
        // mapctx.stroke();
        mapctx.fillRect(self.x/MAP_ZOOM - 1 - x/MAP_ZOOM + mc.width/2, self.y/MAP_ZOOM - 1 - y/MAP_ZOOM + mc.height/2, 3, 3);
			} else {
        mapctx.fillStyle = 'black';
        // mapctx.beginPath();
        // mapctx.arc(self.x/(10)+(mapctx.width/2), self.y/(10)+(mapctx.height/2), 10, 0, 2*Math.PI);
        // mapctx.stroke();
        mapctx.fillRect(self.x/MAP_ZOOM - 1 - x/MAP_ZOOM + mc.width/2, self.y/MAP_ZOOM - 1 - y/MAP_ZOOM + mc.height/2, 3, 3);
        mapctx.textAlign = 'end';
        mapctx.fillStyle = 'white';
        mapctx.font = '12px monospace';
        mapctx.fillText(self.x + ", " + self.y, mc.width-10, 22);
				Sprites.player.render(self.x - x + gc.width/2,self.y - y + gc.height/2);
			}
		}

		self.getDistance = function(pt){
			return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
		}

		self.update = function(newData){
			self.x = typeof newData.x != 'undefined'? newData.x : self.x;
			self.y = typeof newData.y != 'undefined'? newData.y : self.y;
			self.mana = typeof newData.mana != 'undefined'? newData.mana : self.mana;
			self.health = typeof newData.health != 'undefined'? newData.health : self.health;
			self.inventory = newData.inventory || self.inventory;
      self.map = newData.map !== undefined?newData.map:self.map;
			self.level = newData.level || self.level;
      self.emitters = newData.emitters || self.emitters;
      self.activeItem = typeof newData.activeItem != 'undefined'? newData.activeItem : self.activeItem;

			if (self.id == id) {
				mouseAngle = Math.atan2(mousey + y - self.y,mousex + x - self.x) / Math.PI * 180;
				socket.emit('mouseMove',mouseAngle);
				var xTo = self.x + Math.min(CAM_DIST,self.getDistance({x: mousex + x, y: mousey + y}))*Math.cos(mouseAngle*Math.PI/180);
				var yTo = self.y + Math.min(CAM_DIST,self.getDistance({x: mousex + x, y: mousey + y}))*Math.sin(mouseAngle*Math.PI/180);
				x += (xTo-x)/25;
				y += (yTo-y)/25;
				self.inventory.forEach(function(item,index){
          if (item.count > 0) {
            inventoryList[index].innerHTML = "(" + item.count + ") " + item.type;
          } else {
  				  inventoryList[index].innerHTML = "Empty";
          }
				});
			}
		}
		Players[self.id] = self;
		return self;
	}

  var Enemy = function(initPack){
    var self = {};
    self.id = initPack.id;
		self.x = initPack.x;
		self.y = initPack.y;
    self.emitters = initPack.emitters;
		self.map = initPack.map;
    self.health = initPack.health;
    self.healthMax = initPack.healthMax;

    self.update = function(newData){
      self.x = typeof newData.x != 'undefined'? newData.x : self.x;
			self.y = typeof newData.y != 'undefined'? newData.y : self.y;
      self.health = typeof newData.health != 'undefined'? newData.health : self.health;
      self.map = newData.map !== undefined?newData.map:self.map;
      self.emitters = newData.emitters || self.emitters;
    }

    self.render = function(){
      if (self.map != Players[id].map) return;
      var w = 48;
      var h = 16;
      gamectx.fillStyle = '#999999';
      gamectx.fillRect(self.x - w/2 - x + gc.width/2, self.y - (h+10) - y + gc.height/2, w, 10);
      gamectx.fillStyle = 'red';
      gamectx.fillRect(self.x - w/2 -x + gc.width/2, self.y - (h+10) - y + gc.height/2, (self.health/self.healthMax) * w, 10);
      Sprites.enemy.render(self.x - x + gc.width/2,self.y - y + gc.height/2)
      mapctx.fillStyle = 'red';
      mapctx.fillRect(self.x/MAP_ZOOM - 1 - x/MAP_ZOOM + mc.width/2, self.y/MAP_ZOOM - 1 - y/MAP_ZOOM + mc.height/2, 3, 3);
    }

    Enemies[self.id] = self;

    return self;
  }

  var Teleporter = function(initPack) {
    var self = {};
    self.id = initPack.id;
		self.x = initPack.x;
		self.y = initPack.y;
    self.emitters = initPack.emitters;
		self.map = initPack.map;
    self.toX = initPack.toX;
    self.toY = initPack.toY;
    self.toMap = initPack.toMap;

    self.update = function(newData){
      self.x = newData.x || self.x;
			self.y = newData.y || self.y;
      self.map = newData.map !== undefined?newData.map:self.map;
      self.emitters = newData.emitters || self.emitters;
      self.toX = newData.toX || self.toX;
      self.toY = newData.toY || self.toY;
      self.toMap = typeof newData.toMap != 'undefined'? newData.toMap: self.toMap;
    }

    self.render = function(){
      if (Players[id].map !== self.map) return;
      Sprites.teleporter.render(self.x - x + gc.width/2,self.y - y + gc.height/2, 64, 64);
    }

    Teleporters[self.id] = self;
    return self;
  }

  //Define the Wall Class
  var Wall = function(initPack){
    var self = {};
    self.id = initPack.id;
		self.x = initPack.x;
		self.y = initPack.y;
    self.emitters = initPack.emitters;
		self.map = initPack.map;
    self.w = initPack.w;
    self.h = initPack.h;

    self.render = function(){
      if (Players[id].map !== self.map) return;
      gamectx.fillStyle = '#dddddd';
      gamectx.fillRect(self.x-self.w/2 - x + gc.width/2, self.y-self.h/2 - y + gc.height/2, self.w, self.h);
      mapctx.fillStyle = '#dddddd';
      mapctx.fillRect(self.x/MAP_ZOOM - self.w/2/MAP_ZOOM - x/MAP_ZOOM + mc.width/2, self.y/MAP_ZOOM - self.h/2/MAP_ZOOM - y/MAP_ZOOM + mc.height/2, self.w/MAP_ZOOM, self.h/MAP_ZOOM)
    }

    Walls[self.id] = self;
    return self;
  }

	//Define the Bullet Class
	var Bullet = function(initPack) {
		var self = {};
		self.id = initPack.id;
		self.x = initPack.x;
		self.y = initPack.y;
    self.emitters = initPack.emitters;
		self.map = initPack.map;
    self.angle = initPack.angle;

		self.render = function(){
			if (Players[id].map !== self.map) return;
			Sprites.bullet.render(self.x - x + gc.width/2,self.y - y + gc.height/2,16,16,self.angle);
		}

		self.update = function(newData){
			self.x = newData.x || self.x;
			self.y = newData.y || self.y;
      self.map = newData.map !== undefined?newData.map:self.map;
      self.angle = newData.angle;
      self.emitters = newData.emitters || self.emitters;
		}

		Bullets[self.id] = self;
		return self;
	}

	//Define the Item Class
	var Item = function(initPack) {
		var self = {};
		self.id = initPack.id;
		self.x = initPack.x;
		self.y = initPack.y;
		self.type = initPack.type;
		self.count = initPack.count;
		self.map = initPack.map;

		self.render = function() {
			if (Players[id].map !== self.map) return;
			Sprites.item.render(self.x - x + gc.width/2, self.y - y + gc.height/2,32,32,0,GAME.getItemIndexByType(self.type));
		}

		self.update = function(newData) {
			self.x = newData.x || self.x;
			self.y = newData.y || self.y;
			self.type = newData.type || self.type;
      self.map = newData.map !== undefined?newData.map:self.map;
			self.count = newData.count || self.count;
		}

		Items[self.id] = self;
		return self;
	}

  var Effect = function(initPack){
    var self = {};
    self.map = initPack.map;
    self.id = initPack.id;
    self.x = initPack.x;
    self.y = initPack.y;
    self.emitters = initPack.emitters;
    self.type = initPack.type;
    console.log(self.type);
    self.range = initPack.range;
    self.angle = 0;

    self.render = function(){
      if (Players[id].map !== self.map) return;
      self.angle = (self.angle+3)%360;
      switch (self.type){
        case "heal":
          Sprites.effects.health.render(self.x - x + gc.width/2, self.y - y + gc.height/2,2*self.range,2*self.range,self.angle);
          break;
      }
    }

    Effects[self.id] = self;
    return self;
  }

	GAME.state = "login";

	GAME.loadedSprites = 0;
	GAME.backgrounds = [];

	GAME.UI.render = function(){
    var player = Players[id];
    var dmgGrd = gamectx.createRadialGradient(gc.width/2, gc.height/2, 5, gc.width/2, gc.height/2, gc.width/2);
    dmgGrd.addColorStop(0, 'rgba(255,255,255,0)');
    dmgGrd.addColorStop(1, 'rgba(255, 0 , 0 ,' + 0.01*damageTime-- + ')')
    gamectx.fillStyle = dmgGrd;
    gamectx.fillRect(0,0,gc.width,gc.height);
    gamectx.fillStyle = GAME.UI.barBack;
    gamectx.fillRect(GAME.UI.manaBarX,GAME.UI.manaBarY,GAME.UI.manaWidth,GAME.UI.manaHeight);
    gamectx.fillRect(GAME.UI.healthBarX,GAME.UI.healthBarY,GAME.UI.healthWidth,GAME.UI.healthHeight);
		gamectx.fillStyle = GAME.UI.manaColour;
		gamectx.fillRect(GAME.UI.manaBarX,GAME.UI.manaBarY,(Players[id].mana/Players[id].manaMax)*GAME.UI.manaWidth,GAME.UI.manaHeight);
		gamectx.fillStyle = GAME.UI.healthColour;
		gamectx.fillRect(GAME.UI.healthBarX,GAME.UI.healthBarY,(Players[id].health/Players[id].healthMax)*GAME.UI.healthWidth,GAME.UI.healthHeight);
    gamectx.fillStyle = 'rgba(0,0,0,0.7)';
    gamectx.fillRect(gc.width/2-(GAME.UI.hotbarSize+2)*4.5-1, 10, 9*(GAME.UI.hotbarSize+2), GAME.UI.hotbarSize);
    for (var i = 0; i < 9; i++){
      gamectx.strokeStyle = GAME.UI.hotbarBorderColour;
      gamectx.strokeRect((gc.width/2-(GAME.UI.hotbarSize+2)*4.5)+i*(GAME.UI.hotbarSize+2), 10, GAME.UI.hotbarSize, GAME.UI.hotbarSize);
      if (player.inventory[i].type) {
        Sprites.item.render((gc.width/2-(GAME.UI.hotbarSize+2)*4.5)+i*(GAME.UI.hotbarSize+2) + GAME.UI.hotbarSize/2, 10 + GAME.UI.hotbarSize/2, 48, 48, 0, GAME.getItemIndexByType(player.inventory[i].type))
      }
      if (player.activeItem < 9){
        gamectx.strokeStyle = GAME.UI.hotbarSelectColour;
        gamectx.strokeRect((gc.width/2-(GAME.UI.hotbarSize+2)*4.5)+player.activeItem*(GAME.UI.hotbarSize+2)-1, 9, GAME.UI.hotbarSize+2, GAME.UI.hotbarSize+2)
      }
    }
	}

	GAME.setState = function(state){
		GAME.state = state;
		GAME.onStateChange();
	};

	GAME.onStateChange = function(){
		switch(GAME.state){
			//On login state;
			case "login":
				location.reload();
				break;

			//On game load
			case "load":
				GAME.preload();
				GAME.setListeners();
				break;

			//On game start
			case "game":

				//Show the game screen
				$("#loadDiv").hide();
				$("#gameDiv").show();

				//Start listening for packets

				//Start the main loop
				GAME.loop = setInterval(function(){
					gamectx.clearRect(0,0,gc.width,gc.height);
          mapctx.clearRect(0,0,mc.width,mc.height);
					for(var i in Sprites){
						sprite = Sprites[i];
						sprite.update();
					}
					for(var i = 0; i < 3; i++){
						for(var j = 0; j < 3; j++){
							Sprites.backgrounds[Players[id].map].render((j * Sprites.backgrounds[Players[id].map].width) - x,(i * Sprites.backgrounds[Players[id].map].height) - y);
						}
					}
          for(var i in Effects){
            Effects[i].render();
            runEmitters(Effects[i]);
          };
          for(var i in Teleporters){
            Teleporters[i].render();
            runEmitters(Teleporters[i]);
          };
          for (var i in Walls) {
            Walls[i].render();
            runEmitters(Walls[i]);
          };
					for(var i in Players){
						Players[i].render();
            runEmitters(Players[i]);
					};
          for(var i in Enemies){
            Enemies[i].render();
            runEmitters(Enemies[i]);
          }
					for(var i in Bullets){
						Bullets[i].render();
            runEmitters(Bullets[i]);
					};
					for(var i in Items){
						Items[i].render();
					};
          for(var i in Particles){
            Particles[i].render();
          }
          if (EditOn > 0){
            gamectx.fillStyle = 'rgba(153,153,153,' + EditO + ')';
            gamectx.fillRect(EDIT_RECT.x - EDIT_RECT.w/2 - x + gc.width/2, EDIT_RECT.y - EDIT_RECT.h/2 - y + gc.height/2, EDIT_RECT.w, EDIT_RECT.h);
            EDIT_RECT.x += EditLR;
            EDIT_RECT.y += EditUD;
            EDIT_RECT.w = Math.max(20, EDIT_RECT.w + EditWBS);
            EDIT_RECT.h = Math.max(20, EDIT_RECT.h + EditHBS);
            if(EditO < 0.5 || EditO > 1){
              EditOStep *= -1;
            }
            EditO += EditOStep;

            var obj = overlap(Walls, mousex + x, mousey + y);
            if(obj){
              removeRect = obj.id;
              gamectx.strokeStyle = "#ff0000";
              gamectx.strokeRect(obj.x - obj.w/2 - x + gc.width/2, obj.y - obj.h/2 - y + gc.height/2, obj.w, obj.h);
            } else {
              removeRect = false;
            }
          }


					if(GAME.screen == "game"){
						GAME.UI.render();
					}

				},1000/30);
				break;
		}
	}

	GAME.screen = "none";

	GAME.setScreen = function(screen){
		GAME.screen = screen;
		console.log(GAME.screen);
		GAME.onScreenChange()
	}

	GAME.onScreenChange = function(){
		console.log("screen Changed");
		switch(GAME.screen){
			case "game":
				console.log("Screen set to game");
				$("#chat-div").hide();
        $("#chat-div-game").show();
				$("#inventory-div").hide();
        $('#mc').show();
				$("#loadDiv").hide();
				$("#respawn-div").hide();
				break;
			case "chat":
				$("#chat-div").show();
        $("#chat-input").focus();
        setTimeout(function(){
          $("#chat-input").val("");
        },2);
        $("#chat-div-game").hide();
				break;
			case "inventory":
				$("#inventory-div").show();
        $("#mc").hide();
				break;
			case "respawn":
				$("#respawn-div").show();
		}
	}
	// GAME.requiredSprites = [];
	// //Define images used in rendering
	// GAME.spriteSheet = new Image();
	// GAME.background = new Image();
	// GAME.bulletSprite = new Image();

	//Define a loading bar updater
	GAME.setLoadProgress = function(value) {
		$("#loadStatus").css("width",value + "%");
		$("#loadStatus").text("Loading: " + value + "%");
	}

	//Define a poller for async requests during preload
	//GAME.preloadPoll = null;

	//Define an asset marker for preload polling
	GAME.setAssetReady = function() {
		this.ready = true;
		GAME.loadedSprites += 1;
	}

	//Define the sprite loader
	GAME.loadSprites = function() {
		GAME.sprites[0] = new Image();
		GAME.sprites[0].onload = GAME.setAssetReady;
		GAME.sprites[0].src = '/client/img/sprites.png';
		Sprites.player = Sprite({
			name: "player",
			id: 0,
			width: 16,
			height: 16,
			image: GAME.sprites[0],
			frameTime: 1,
			loop: false
		});
		GAME.backgrounds[0] = new Image();
		GAME.backgrounds[0].onload = GAME.setAssetReady;
		GAME.backgrounds[0].src = "/client/img/background.png";
		Sprites.backgrounds[0] = Sprite({
			name: "background0",
			id: 1,
			width: 1920,
			height: 1080,
			image: GAME.backgrounds[0],
			frameTime: 1,
			loop: false
		});
    GAME.backgrounds[1] = new Image();
		GAME.backgrounds[1].onload = GAME.setAssetReady;
		GAME.backgrounds[1].src = "/client/img/dessert.png";
		Sprites.backgrounds[1] = Sprite({
			name: "background1",
			id: 1,
			width: 1920,
			height: 1080,
			image: GAME.backgrounds[1],
			frameTime: 1,
			loop: false
		});
		GAME.sprites[1] = new Image();
		GAME.sprites[1].onload = GAME.setAssetReady;
		GAME.sprites[1].src = "/client/img/bullet.png";
		Sprites.bullet = Sprite({
			name: "bullet",
			id: 2,
			width: 32,
			height: 32,
			image: GAME.sprites[1],
			frameTime: 4,
			loop: true,
			frameCount: 2
		});
    GAME.sprites[2] = new Image();
		GAME.sprites[2].onload = GAME.setAssetReady;
		GAME.sprites[2].src = "/client/img/item.png";
		Sprites.item = Sprite({
			name: "item",
			id: 3,
			width: 32,
			height: 32,
			image: GAME.sprites[2],
			frameTime: 1,
			loop: false,
			frameCount: 1
		});
    GAME.sprites[3] = new Image();
    GAME.sprites[3].onload = GAME.setAssetReady;
    GAME.sprites[3].src = '/client/img/health_effect.png';
    Sprites.effects.health = Sprite({
      name: "health_effect",
      id: 4,
      width: 128,
      height: 128,
      image: GAME.sprites[3],
      frameTime: 1,
      loop: false,
      frameCount: 1
    });
    GAME.sprites[4] = new Image();
    GAME.sprites[4].onload = GAME.setAssetReady;
    GAME.sprites[4].src = '/client/img/particles.png';
    Sprites.particle = Sprite({
      name: "particle",
      id: 5,
      width: 10,
      height: 10,
      image: GAME.sprites[4],
      frameTime: 1,
      loop: false,
      frameCount: 1
    });
    GAME.sprites[5] = new Image();
    GAME.sprites[5].onload = GAME.setAssetReady;
    GAME.sprites[5].src = '/client/img/teleporter.png';
    Sprites.teleporter = Sprite({
      name: "teleporter",
      id: 6,
      width: 128,
      height: 128,
      image: GAME.sprites[5],
      frameTime: 3,
      loop: true,
      frameCount: 4
    });
    GAME.sprites[6] = new Image();
    GAME.sprites[6].onload = GAME.setAssetReady;
    GAME.sprites[6].src = '/client/img/enemy.png';
    Sprites.enemy = Sprite({
      name:'enemy',
      id: 7,
      width: 16,
      height: 16,
      image: GAME.sprites[6],
      frameTime: 1,
      loop: false,
      frameCount: 1
    })

		GAME.preloadPoll = setInterval(function(){
			if(GAME.loadedSprites >= GAME.sprites.length + GAME.backgrounds.length){
				GAME.setState("game");
				GAME.setScreen("game");
				clearInterval(GAME.preloadPoll);
			}
		},1000/30);
	};

	GAME.setListeners = function() {

		//Create players, bullets and items on creation
		socket.on("init",function(data){
			data.player.forEach(function(item, index){
				new Player(item);
			});
			data.bullet.forEach(function(item, index){
				new Bullet(item);
			});
			data.item.forEach(function(item, index){
				new Item(item);
			});
      data.effect.forEach(function(item,index){
        new Effect(item);
        console.log(item.range);
      });
      data.teleporter.forEach(function(item, index){
        new Teleporter(item);
      })
      data.wall.forEach(function(item, index){
        new Wall(item);
      })
      data.enemy.forEach(function(item, index){
        new Enemy(item);
      })
		});

		//Update players, bullets and items on update
		socket.on("update", function(data){
			data.player.forEach(function(item, index){
				if (Players[item.id]) Players[item.id].update(item);
			});
			data.bullet.forEach(function(item, index){
				if (Bullets[item.id]) Bullets[item.id].update(item);
			});
			data.item.forEach(function(item, index){
				if (Items[item.id]) Items[item.id].update(item);
			})
      data.teleporter.forEach(function(item, index){
        if (Teleporters[item.id]) Teleporters[item.id].update(item);
      })
      data.enemy.forEach(function(item, index){
        if (Enemies[item.id]) Enemies[item.id].update(item);
      })
		});

		//Remove players, bullets and items on removal
		socket.on("remove", function(data){
			data.player.forEach(function(item,index){
				delete Players[item];
			});
			data.bullet.forEach(function(item,index){
				delete Bullets[item];
			});
			data.item.forEach(function(item,index){
				delete Items[item];
			});
      data.effect.forEach(function(item,index){
        delete Effects[item];
      });
      data.teleporter.forEach(function(item, index){
        delete Teleporters[item];
      })
      data.wall.forEach(function(item,index){
        delete Walls[item];
      })
      data.enemy.forEach(function(item, index){
        delete Enemies[item];
      })
		})

    socket.on('damage', () => {
      damageTime = 50;
    })

		socket.on("killed", function(data){
			GAME.setScreen('respawn');
			$("#death-text").text("You were killed by " + (typeof Players[data.who] != 'undefined' ? Players[data.who].user : "Enemy"));
      console.log("Killed");
      left = right = up = down = 0;
      leftRight = left + right;
      upDown = up + down;
      socket.emit('keyPress',{
				leftRight: leftRight,
				upDown: upDown
			});
		})

		socket.on("respawn", function(){
			GAME.setScreen("game");
			console.log(x, y);
		})

		document.onmousemove = function(event){
			var rect = gc.getBoundingClientRect();
			mousex = -gc.width/2 + event.clientX - rect.left;
			mousey = -gc.height/2 + event.clientY - rect.top;
		}
	}

  GAME.onItemSelected = function(){
    if(inventoryList[inventorySelected].innerHTML != "Empty"){
      var item = Players[id].inventory[inventorySelected];
      var values = ITEM_LIST[GAME.getItemIndexByType(item.type)];
      $("#inventory-item-name").text(item.type);
      $("#inventory-item-description").text(values.lore);
      if(values.properties !== undefined){
        $("#inventory-item-health p").text(values.properties.health);
        $("#inventory-item-defence p").text(values.properties.defence);
        $("#inventory-item-mana p").text(values.properties.mana);
      } else {
        $("#inventory-item-health p").text(0);
        $("#inventory-item-defence p").text(0);
        $("#inventory-item-mana p").text(0);
      }
    }
  }

	//Define the game's preload steps
	GAME.preload = function() {
		//Show the loading screen
		$("#signDiv").hide();
		$("#loadDiv").show();
		GAME.setLoadProgress(0);

		//Load the sprites for the game
		GAME.loadSprites()

		//Start recieving position packets
		// socket.on('newPositions',function(data){
		// 	gamectx.font = '30px Arial';
		// 	gamectx.clearRect(0,0,gc.width,gc.height);

		// 	data.player.forEach(function(item, index){
		// 		gamectx.fillStyle = 'black';
		// 		if (item.id != id){
		// 			gamectx.fillText(item.number, item.x - x + gc.width/2, item.y - y + gc.height/2);
		// 			Sprites.player.render(item.x - x + gc.width/2-8,item.y - y + gc.height/2-8);
		// 		} else {
		// 			Sprites.player.render(gc.width/2-8, gc.height/2-8);
		// 			x= item.x; y = item.y;
		// 			gamectx.shadowBlur = 10;
		// 			gamectx.shadowColor = '#00ffff';
		// 			gamectx.fillStyle = 'white';
		// 			gamectx.fillRect(10,10,item.mana,10);
		// 			gamectx.shadowBlur = 0;
		// 			item.inventory.forEach(function(item,index){
		// 				inventoryList[index].innerHTML = "(" + item.count + ") " + item.type;
		// 			})
		// 		};
		// 	})
		//
		// 	data.bullet.forEach(function(item, index){
		// 		gamectx.beginPath()
		// 		gamectx.fillStyle = 'black'
		// 		gamectx.fillRect(item.x-5-x+gc.width/2,item.y-5-y+gc.height/2,10,10)
		// 		gamectx.fill();
		// 	})
		//
		// 	data.item.forEach(function(item, index){
		// 		gamectx.beginPath();
		// 		gamectx.fillStyle = "blue";
		// 		gamectx.fillRect(item.x-8-x+gc.width/2,item.y-8-y+gc.height/2,16,16);
		// 		gamectx.fill();
		// 	})
		//
		// })
	}

	//-------------------------------------------SIGN---------------------------------------------


	socket.on("signInResponse",function(data){
		if(data.success){
			GAME.setState("load");
		}
		else {
      var reason = "";
      switch(data.reason){
        case 0:
          reason = "Incorrect username or password.";
          break;
        case 1:
          reason = "User already connected.";
          break;
      }
			$("#signAlert").attr('class','alert alert-danger').html("Sign in unsuccessful. " + reason);
			$("#signAlert").show();
		}
	})
	var signDiv = $("#signDiv");
	var signDivUsername = $("#user");
	var signDivPassword = $("#psw");
	var signDivSignIn = $("#sign-in");
	var signDivSignUp = $("#sign-up");

	$("#sign-in").click(function(){
		socket.emit("signIn",{
			username: signDivUsername.val(),
			password: signDivPassword.val()
		})
	});

	signDivSignUp.click(function(){
		socket.emit("signUp",{
			username: signDivUsername.val(),
			password: signDivPassword.val()
		})
	})

	socket.on('signUpResponse',function(data){
		if(data.success){
			$("#signAlert").attr('class','alert alert-success').html("Sign up successful.");
			$("#signAlert").show();
		} else {
			$("#signAlert").attr('class','alert alert-danger').html("Sign up unsuccessful.");
			$("#signAlert").show();
		}
	})

	socket.on("addToChat", function(data){
    var html = "<div class='new'>" + data + "</div>";
		$(html).show().appendTo("#chat-text-game").show().animate({opacity: "100%"},10000).fadeOut(3000,function(){$(this).remove()});
    $(html).appendTo("#chat-text");
	});

	socket.on('evalAnswer',function(data){
    var html = "<div class='new'>" + data + "</div>";
		$(html).show().appendTo("#chat-text-game").show().animate({opacity: "100%"},10000).fadeOut(3000,function(){$(this).remove()});
    $(html).appendTo("#chat-text");
	})

	socket.on('serverConnect', function(data){
		id = data.id;
		console.log('Connected to Server with UUID: '+ data.id);
	});



	chatForm.submit(function(e){
		e.preventDefault();
		if(chatInput.val()[0] === "/"){
			socket.emit("serverEval",chatInput.val().slice(1));
		}
		else socket.emit("chatMsg",chatInput.val());
		chatInput.val('');
		GAME.setScreen("game");
	})

	document.onkeydown = function(event){
		if (GAME.screen == "game" && event.keyCode != 13 &&!(event.keyCode > 72 && event.keyCode < 78) && !(event.keyCode > 36 && event.keyCode < 41)){
			if(event.keyCode === 68) right = 1
			else if(event.keyCode === 83) down = 1
			else if(event.keyCode === 65) left = -1
			else if(event.keyCode === 87) up = -1;
			leftRight = left+right;
			upDown = up+down;
			socket.emit('keyPress',{
				leftRight: leftRight,
				upDown: upDown
			})
		} else if (GAME.screen == 'game'){
      switch(event.keyCode){
        case 13:
          if(EditOn > 0) socket.emit('serverEval', 'Wall({x: ' + EDIT_RECT.x + ', y: ' + EDIT_RECT.y + ', w: ' + EDIT_RECT.w + ', h: ' + EDIT_RECT.h + '})')
          break;
        case 73:
          EditHB = 1;
          break;
        case 74:
          EditWS = -1;
          break;
        case 75:
          EditHS = -1;
          break;
        case 76:
          EditWB = 1;
          break;
        case 77:
          EditOn *= -1;
          break;
        case 37:
          EditL = -1;
          break;
        case 38:
          EditU = -1;
          break;
        case 39:
          EditR = 1;
          break;
        case 40:
          EditD = 1;
          break;
      }

      EditWBS = EditWB + EditWS;
      EditHBS = EditHB + EditHS;


      EditUD = EditU + EditD;
      EditLR = EditL + EditR;

    }
	}

	document.onkeyup = function(event){
		if(GAME.screen=="game" && !(event.keyCode > 72 && event.keyCode < 78) && !(event.keyCode > 36 && event.keyCode < 41)){
			if(event.keyCode === 68) right = 0
			else if(event.keyCode === 83) down = 0
			else if(event.keyCode === 65) left = 0
			else if(event.keyCode === 87) up = 0;
			leftRight = left+right;
			upDown = up+down;
			socket.emit('keyPress',{
				leftRight: leftRight,
				upDown: upDown
			})
		} else {
      switch(event.keyCode){
        case 73:
          EditHB = 0;
          break;
        case 74:
          EditWS = 0;
          break;
        case 75:
          EditHS = 0;
          break;
        case 76:
          EditWB = 0;
          break;
        case 37:
          EditL = 0;
          break;
        case 38:
          EditU = 0;
          break;
        case 39:
          EditR = 0;
          break;
        case 40:
          EditD = 0;
          break;
      }

      EditWBS = EditWB + EditWS;
      EditHBS = EditHB + EditHS;

      EditUD = EditU + EditD;
      EditLR = EditL + EditR;
    }
	}

	document.onkeypress = function(event){
		console.log(event.keyCode);
    var code = (event.keyCode) ? event.keyCode : event.which;
		if (code === 101 && GAME.screen == "game"){
			GAME.setScreen("inventory");
		} else if (code === 101 && GAME.screen == "inventory"){
			GAME.setScreen("game");
		} else if (code === 92 && GAME.screen == "game"){
			GAME.setScreen("chat");
      $("#chat-input").val("");
		} else if (code === 92 && GAME.screen == "chat"){
			GAME.setScreen("game");
		} else if (code < 58 && code > 48 && GAME.screen == 'game'){
      socket.emit('equip', {slot: code - 49});
    }
	}

	document.onmousedown = function(event){
		if (GAME.screen == "game"){
			if (event.button == 0) attackButton = true;
      if (event.button == 2) useButton = true;
      if (EditOn > 0 && removeRect) {
        if (event.button == 0) socket.emit('serverEval', 'Wall.remove(' + removeRect + ')');
      }
			socket.emit('keyPress',{
				leftRight: leftRight,
				upDown: upDown,
				attackButton: attackButton,
				useButton: useButton,
        mousex: mousex + x,
        mousey: mousey + y
			})
		}
	}

	document.onmouseup = function(event){
		if (GAME.screen == "game"){
			if (event.button == 0) attackButton = false;
      if (event.button == 2) useButton = false;
			socket.emit('keyPress',{
				leftRight: leftRight,
				upDown: upDown,
				attackButton: attackButton,
				useButton: useButton,
        mousex: mousex - x,
        mousey: mousey - y
			})
		}
	}

  document.oncontextmenu = function(event){
    event.preventDefault();
  }

  $("#inventory-list li").on("click", function(){
    if ($(this).text() != "Empty"){
      inventorySelected = $(this).index();
      GAME.onItemSelected();
    }
  })

  $("#inventory-item-equip").click(function(){
    console.log("Equipped slot: " + inventorySelected);
    socket.emit("equip", {slot: inventorySelected});
  })

  $('#inventory-item-drop').mousedown(function(event){
    var code = event.which;
    switch(code){
      case 1:
        socket.emit('drop', {slot: inventorySelected, amount: 'all'});
        break;
      case 3:
        socket.emit('drop', {slot: inventorySelected, amount: 1});
        break;
    }
  })

});
