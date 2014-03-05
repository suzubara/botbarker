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
		guessingTime: 30000, // Amount of time people have to guess
		warningTime: 10000
	};
	self.game = {
		product: null,
		guesses: {},
		winner: false
	};

	var getProduct = function() {
		getHtml(random_amzn_url, random_amzn_path, function(html) {
			self.game.product = getProductDetails(html);
			if (self.game.product == -1)
			{
				self.opt.activeGame = false;
				self.bot.client.say(self.opt.channel, "Whoops.. try again");
			}

			getHtml('www.amazon.com', self.game.product.path, function(html) {
				self.game.product.price = getPrice(html);

				if (self.game.product.price == -1)
				{
					self.opt.activeGame = false;
					self.bot.client.say(self.opt.channel, "Whoops.. try again");
				}
				else
				{
					self.bot.client.say(self.opt.channel, "Today we'll be looking at this lovely " + self.game.product.name + "!");
					self.bot.client.say(self.opt.channel, "Check out the gorgeous details! " + self.game.product.img);
					takeGuesses();
				}
			});
		});
	};

	var validateGuess = function(text) {
		var priceRegex = /\$[0-9]{1,3}(,[0-9]{3})*(\.[0-9]+)?/g;
		return priceRegex.exec(text);
	};
	
	var guessListener = function(nick, text, msg) {
		if (self.opt.activeGame) {
			var guess = validateGuess(text);

			if (guess) {
				handleGuess(nick, guess[0]);
			}
		}
	};

	var takeGuesses = function() {
		self.bot.client.say(self.opt.channel, "Do I hear any guesses for how much this beauty will set you back? You have " + (self.opt.guessingTime / 1000) + " seconds to guess!");

		self.bot.client.addListener('message'+self.opt.channel, guessListener);
		
		setTimeout(function() {
			endGameWarning();
		}, self.opt.guessingTime - self.opt.warningTime);
	};

	var endGameWarning = function() {
		self.bot.client.say(self.opt.channel, "Tick tock! Only " + (self.opt.warningTime / 1000) + " seconds left to guess!");	
		setTimeout(function() {
			endGame();
		}, self.opt.warningTime);
	};

	var handleGuess = function(nick, guess) {
		if (typeof self.game.guesses[nick] == "undefined") {
			
			guessOkay = true;
			for (var alreadyGuessed in self.game.guesses) {
				if (guess == self.game.guesses[alreadyGuessed]) {
					guessOkay = false;
				}
			}
			
			if (guessOkay) {
				self.game.guesses[nick] = guess;
			} else {
				self.bot.client.say(self.opt.channel, guess + ' has already been guessed, ' + nick + ' you big dummy!');
			}
			
		} else {
			self.bot.client.say(self.opt.channel, nick + ' you already guessed you fool!!');
		}
	};

	var handleResults = function() {
		
		var intRegex = /\$*\,*/g,
				priceInt = parseInt(self.game.product.price.replace(intRegex, '')),
				winnerGuess = 0,
				winnerNick;
		
		for (var nick in self.game.guesses) {
			self.bot.client.say(self.opt.channel, "Contestant " + nick + " says " + self.game.guesses[nick] + "!");
			var guessInt = parseInt(self.game.guesses[nick].replace(intRegex, ''));
			
			if (guessInt <= priceInt && guessInt > winnerGuess) {
				winnerGuess = guessInt;
				winnerNick = nick;
			}
		}
		
		return winnerNick;
	};

	var endGame = function() {
		self.bot.client.removeListener('message'+self.opt.channel, guessListener);
		self.bot.client.say(self.opt.channel, "Okay, time's up! Let's see...");
		
		self.game.winner = handleResults();
		
		if (self.game.winner) {
			self.bot.client.say(self.opt.channel, "The price was " + self.game.product.price + ". Congratulations " + self.game.winner + "! Remember to spay and neuter your pets, kids!");	
		} else {
			self.bot.client.say(self.opt.channel, "The price was " + self.game.product.price + ". YOU ALL LOSE! Unneutered pets everywhere hate you.");
		}

		resetGame();
	};
	
	var resetGame = function() {
		self.opt.activeGame = false;
		self.game.product = null;
		self.game.guesses = {};
		self.game.winner = false;
		startListening();
	};

	var gameListener = function(nick, text, msg) {
		if (text == "botbarker, let's play the price is right" && self.opt.activeGame === false) {
			self.startGame();
		}
	};

	var startListening = function() {
		self.bot.client.addListener('message'+self.opt.channel, gameListener);
	};

	this.startGame = function() {
		console.log('start game');
		self.opt.activeGame = true;
		self.bot.client.removeListener('message'+self.opt.channel, gameListener);
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


var random_amzn_url = 'www.randomamazonproduct.com';
var random_amzn_path = '/index.php';

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
	var amzn_img = /"amazon-image" src="(http\:\/\/.*)"/.exec(html);
	if (!amzn_img)
	{
		return -1;
	}
	amzn_img = amzn_img[1];

	var amzn_title = /"amazon-title">(.*?)</.exec(html);
	if (!amzn_title)
	{
		return -1;
	}
	amzn_title = amzn_title[1];

	var amzn_path = /href=\"http:\/\/www.amazon.com(\/.*?)\" class=\"outlink\"/.exec(html);
	if (!amzn_path)
	{
		return -1;
	}
	amzn_path = amzn_path[1];

	console.log('http://www.amazon.com/' + amzn_path);

	return {
		name: amzn_title,
		img: amzn_img,
		path: amzn_path
	};
}

function getPrice(html) {
	var match = /\$(\d+\.\d\d)/.exec(html);
	if (match)
	{
		return match[1];
	}
	else
	{
		console.log('price failed!');
		return -1;
	}
}
