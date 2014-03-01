var baseBot = require('./basebot');

var joinServer = 'lt3.us';
var joinPort = 36667;
var joinChannels = ['#ponyprice'];
var botName = 'BaseBot';

var bot = new baseBot.BotBarker(joinServer, joinPort, joinChannels);