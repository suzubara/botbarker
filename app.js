// read in configuration parameters
var fs = require('fs');
var config = __dirname + '/config.json';

fs.readFile(config, 'utf8', function (err, data)
{
	if (err)
	{
		console.log('Error reading config: ' + err);
	}

	config = JSON.parse(data);

	var config_params = [
		'server',
		'port',
		'channels',
		'bot_name'
	];

	for( var i = 0; i < config_params.length; i++)
	{
		if (!(config_params[i] in config))
		{
			console.log('Missing required parameter "' + config_params[i] + '" in config.json.');
			process.exit(1);
		}
	}

	var baseBot = require('./basebot');

	var joinServer   = config.server;
	var joinPort     = config.port;
	var joinChannels = config.channels;
	var botName      = config.bot_name;

	var bot = new baseBot.BotBarker(joinServer, joinPort, joinChannels, botName);
});
