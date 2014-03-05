exports.Bot = Bot;
exports.BotBarker = BotBarker;
var irc = require('irc');
var http = require('http');

// Bot base class
function Bot(server, port, channels, name) {
	var self = this;	
	self.opt = {
		debug: true,
		server: server,
		port: port,
		channels: channels,
		name: name
	};

	this.initClient = function() {
		self.client = new irc.Client(self.opt.server, self.opt.name, {
			debug: self.opt.debug,
			channels: self.opt.channels,
			port: self.opt.port
		});
	}

	this.addErrorListener = function() {
		self.client.addListener('error', function(message) {
			console.error('ERROR: %s: %s', message.command, message.args.join(' '));
		});
	}
}

// BotBarker!

function BotBarker(server, port, channels, name) {

	var self = this;
	self.opt = {
		channel: channels[0],
		activeGame: false,
		maxGuesses: 10, // # guesses before game is ended automatically
		priceThreshold: 5 // user has to guess within x dollars of actual price
	};
	self.game = {
		product: null,
		numGuesses: 0,
		winner: false
	};

	var getProduct = function() {
		getHtml(url, path, function(html) {
			self.game.product = getProductDetails(html);
			console.log('getProduct html' + html);
			console.log('done getting product');
			self.bot.client.say(self.opt.channel, "Today we'll be looking at this lovely " + self.game.product.name + "!");
			self.bot.client.say(self.opt.channel, "Check out the gorgeous details! " + self.game.product.img);
			takeGuesses();
		});
	};

	var validateGuess = function(text) {
		var priceRegex = /\$[0-9]{1,3}(,[0-9]{3})*(\.[0-9]+)?/g;
		return priceRegex.exec(text);
	};

	var takeGuesses = function() {
		self.bot.client.say(self.opt.channel, "Do I hear any guesses for how much this beauty will set you back?");

		self.bot.client.addListener('message'+self.opt.channel, function(nick, text, msg) {
			if (self.opt.activeGame && (self.game.numGuesses <= self.opt.maxGuesses)) {
				var guess = validateGuess(text);

				if (guess) {
					handleGuess(nick, guess[0]);
				}
			}
		});
	};

	var handleGuess = function(nick, guess) {
		console.log('handling guess');
		self.bot.client.say(self.opt.channel, nick + " is guessing " + guess);

		var intRegex = /\$*\,*/g;
		var guessInt = parseInt(guess.replace(intRegex, ''));
		var priceInt = parseInt(self.game.product.price.replace(intRegex, ''));
		console.log('actual guess: ' + guessInt);
		console.log('actual price: ' + priceInt);

		if (guessInt > (priceInt + self.opt.priceThreshold)) {
			self.bot.client.say(self.opt.channel, "A bit too high there! Try again!");
			self.game.numGuesses++;

			if (self.game.numGuesses > self.opt.maxGuesses) {
				endGame(false);
			}
		} else if (guessInt < (priceInt - self.opt.priceThreshold)) {
			self.bot.client.say(self.opt.channel, "Too low, too low! Try again!");
			self.game.numGuesses++;

			if (self.game.numGuesses > self.opt.maxGuesses) {
				endGame(false);
			}
		} else {
			self.bot.client.say(self.opt.channel, "Close enough!");
			self.game.winner = nick;
			endGame(true);
		}

	};

	var endGame = function(winner) {
		if (winner) {
			self.bot.client.say(self.opt.channel, "The price was " + self.game.product.price + ". Congratulations " + self.game.winner + "! If only I had something to give you.");
		} else {
			self.bot.client.say(self.opt.channel, "The price was... " + self.game.product.price + ". You all suck at this!");
		}

		self.opt.activeGame = false;
		self.game.product = null;
		self.game.numGuesses = 0;
		self.game.winner = false;
		startListening();
	};

	var startListening = function() {
		self.bot.client.addListener('message'+self.opt.channel, function(nick, text, msg) {
			if (text == "play" && self.opt.activeGame === false) {
				self.startGame();
			}
		});
	};

	this.startGame = function() {
		console.log('start game');
		self.opt.activeGame = true;
		self.bot.client.say(self.opt.channel, "Okay, let's play Price is Right!");
		getProduct();
	}

	self.bot = new Bot(server, port, channels, name);
	self.bot.initClient();
	startListening();

}

var fakeProduct = {
	name: "Image® Broadcasting Studio Microphone Arm Stand with Shock Mount",
	img: 'http://ecx.images-amazon.com/images/I/41B2ST8mIgL.jpg',
	price: '$49.99'
};


var url = 'www.randomamazonproduct.com';
var path = '/index.php';

function getHtml(url, path, callback)
{
	var http = require('http');
	var options = {
		host: url,
		port: 80,
		path: path
	};

	var html = '';
	http.get(options, function(res) {
		res.on('data', function(chunk) {
			html += chunk;
		});
		res.on('end', function() {
			callback(html);
		});
	}).on('error', function(e) {
		console.log("Got error: " + e.message);
	});
}

function getProductDetails(html) {
	return {
		name: 'ISS',
		price: '10.24',
		img: 'http://www.nasa.gov/sites/default/files/styles/360x225/public/budget_cover_no_text_ppt_1.jpg'
	};
}
