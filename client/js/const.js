var GAME = {};

//---------------------------- UI constants ------------------------------------
GAME.UI = {};

//-------- HUD --------
//General backgrounds
GAME.UI.barBack = "#404040";
GAME.UI.nameOffsetY = 35;

//Mana Bar
GAME.UI.manaBarX = 10;
GAME.UI.manaBarY = 10;
GAME.UI.manaWidth = 200;
GAME.UI.manaHeight = 20;
GAME.UI.manaColour = "#0047b3";

//Health Bar
GAME.UI.healthBarX = 10;
GAME.UI.healthBarY = 40;
GAME.UI.healthWidth = 200;
GAME.UI.healthHeight = 20;
GAME.UI.healthColour = "#c91d1d";

//------- Inventory --------
GAME.UI.inventoryW = 700;
GAME.UI.inventoryH = 665;
GAME.UI.inventoryTitleH = 20;
GAME.UI.inventoryListW = 210;
GAME.UI.inventoryInfoW = 210;
GAME.UI.inventoryIconSize = 166;
GAME.UI.inventoryInfoPadding = 20;
GAME.UI.inventoryItemStatsH = 70;
GAME.UI.inventoryPlayerStatsH = 50;

GAME.UI.inventoryBGColour = "#57270f";
GAME.UI.inventoryHighlightColour = "#c67953";
GAME.UI.inventoryBorderColour = "#29140a";
GAME.UI.inventoryFieldColour = "#6b412e";
GAME.UI.inventoryButtonColour = "#3d6b2e";

//-------- Hotbar ---------
GAME.UI.hotbarBGColour = 'rgba(0,0,0,0.7)';
GAME.UI.hotbarBorderColour = "#999999";
GAME.UI.hotbarSize = 64;
GAME.UI.hobarSelectColour = '#cccccc';


//----------------------------- Item list --------------------------------------
GAME.getItemIndexByType = function(type){
  var result;
  ITEM_LIST.forEach(function(item,index){
    if (item.type == type) result = index;
  })
  return result;
}

ITEM_LIST = [
  {type: "Gold", lore: "The basic form of currency.", group: "general"},
  {type: "Spell Book", lore: "A basic book of spells.", group: "spell", properties: {health: -5, speed: 60, mana: 20, accuracy: 22.5, origin: "player", life: 60}},
  {type: "Healing Aura", lore: "An aura with healing properties", group: "spell", properties: {health: 1, speed: 2, mana: 10, origin: "mouse", life: 90, range: 60, cost: 1, type: "heal"}},
  {type: "Sword", lore: "A basic steel sword", group: "melee", properties: {health: -7, speed: 30, mana: 0, origin: "player", range: 30}},
  {type: "OP", lore: "An OP's weapon", group: "spell", properties: {health: -5,speed: 1, mana: 0, accuracy: 180, origin: "player", life: 60}},
  {type: 'Helmet', lore: 'A basic steel helmet', group: 'helmet', properies: {armour: 3}},
  {type: null, group: 'none', properties: {armour: 0}}
];

if(typeof module != "undefined"){
  module.exports = {
    ITEM_LIST: ITEM_LIST,
    getItemIndexByType: GAME.getItemIndexByType
  };
}

//--------------------------- Player Constants ---------------------------------

GAME.player = {};

GAME.player.w = 16;
GAME.player.h = 16;
