var Discordie = require("discordie");
var Events = Discordie.Events;
var ffmpeg = require("fluent-ffmpeg");
var downloader = require("./downloader");


var auth = require("./auth");

var admins = [
	"95454946421379072",	// Pikachu
	"114774672654073856",	// cutei
	"114903349463089152",	// Ravenn
	"115750198885482498",	// Lonely
	"114991267322003457"	// BritishFuckBoi aka Lelouch
];

var songQueue = [];
var queueLocked = false;
var playing = false;

var client = new Discordie();
var currVoiceChannel;
var currSpeakingChannel;

function connect() {
	client.connect(auth);
}
connect();

client.Dispatcher.on(Events.DISCONNECTED, (e) => {
	console.log("Reconnecting");
	setTimeout(connect, 5000);
});

client.Dispatcher.on(Events.GATEWAY_READY, (e) => {
	console.log("Connected as: " + client.User.username);
});

client.Dispatcher.on(Events.MESSAGE_CREATE, (e) => {
	if (e.message.author.id == client.User.id) {
		console.log("Ignoring own message");
		return;
	}

	var content = e.message.content;

	if (content[0] == "!") {
		var beginArgs = content.indexOf(" ");
		beginArgs = (beginArgs == -1) ? 0 : beginArgs;

		var command = content.substring(1, beginArgs || content.length).toLowerCase();

		switch (command) {
			case "pikayt":
				if (beginArgs) {
					e.message.channel.guild.voiceChannels.some(channel => {
						if (channel.members.some(member => {
							return member.id == e.message.author.id;
						})) {

							if (queueLocked) {
								e.message.channel.sendMessage("@" + e.message.author.username + ": Sorry, but the queue is currently locked! Try again later.", e.message.author);
								return true;
							}

							e.message.channel.sendTyping().then(() => {
							currSpeakingChannel = e.message.channel;
								downloader(content.substring(beginArgs + 1), file => {
									if (file.error) {
										currSpeakingChannel.sendMessage("@" + e.message.author.username + " ERROR: " + file.error, e.message.author);
										return;
									}
									currSpeakingChannel.sendMessage("@" + e.message.author.username + ": Now downloading " + file.name, e.message.author);
									if (!currVoiceChannel) {
										currVoiceChannel = channel;
										channel.join().then(v => play(file, v));
									} else {
										play(file);
									}
								});
							});
							return true;
						} else {
							return false;
						}
					}) || e.message.channel.sendMessage("@" + e.message.author.username + ": You are not in a voice channel! Join one and I will play.", e.message.author);
				}
				break;

			case "pikajoin":
				if (admins.indexOf(e.message.author.id) != -1) {
					if (currVoiceChannel) {
						stopPlaying = true;
						currVoiceChannel.leave();
					}
					e.message.channel.guild.voiceChannels.some(channel => {
						if (channel.members.some(member => {
							return member.id == e.message.author.id;
						})) {
							currVoiceChannel = channel;
							channel.join();
							e.message.channel.sendMessage("@" + e.message.author.username + ": Joined voice channel " + channel.name, e.message.author);
							return true;
						} else {
							return false;
						}
					}) || e.message.channel.sendMessage("@" + e.message.author.username + ": You are not in a voice channel! Join one and I will play.", e.message.author);
				} else {
					e.message.channel.sendMessage("@" + e.message.author.username + ": No permission!", e.message.author);
				}
				break;

			case "pikaplay":
				if (admins.indexOf(e.message.author.id) != -1) {
					e.message.channel.guild.voiceChannels.some(channel => {
						if (channel.members.some(member => {
							return member.id == e.message.author.id;
						})) {
							if (currVoiceChannel != null && currVoiceChannel.id != channel.id) {
								console.log("Switched to " + channel.name);
								stopPlaying = true;
								currVoiceChannel.leave();
								setTimeout(() => channel.join().then(v => play(null, v)), 100);
							} else if (currVoiceChannel == null) {
								console.log("Joined " + channel.name);
								channel.join().then(v => play(null, v));
							} else {
								play();
							}
							currVoiceChannel = channel;
							currSpeakingChannel = e.message.channel;

							e.message.channel.sendMessage("@" + e.message.author.username + ": Started playback", e.message.author);
							return true;
						} else {
							return false;
						}
					}) || e.message.channel.sendMessage("@" + e.message.author.username + ": You are not in a voice channel! Join one and I will play.", e.message.author);;
				} else {
					e.message.channel.sendMessage("@" + e.message.author.username + ": No permission!", e.message.author);
				}
				break;
			case "pikastop":
				if (admins.indexOf(e.message.author.id) != -1) {
					e.message.channel.sendMessage("@" + e.message.author.username + " stopped all songs", e.message.author);
					stopPlaying = true;
				} else {
					e.message.channel.sendMessage("@" + e.message.author.username + ": No permission!", e.message.author);
				}
				break;
			case "pikaleave":
				if (admins.indexOf(e.message.author.id) != -1) {
					stopPlaying = true;
					currVoiceChannel.leave();
					currVoiceChannel = null;
					e.message.channel.sendMessage("@" + e.message.author.username + ": Left all voice channels", e.message.author);
				} else {
					e.message.channel.sendMessage("@" + e.message.author.username + ": No permission!", e.message.author);
				}
				break;

			case "pikaclear":
				if (admins.indexOf(e.message.author.id) != -1) {
					songQueue = [];
					stopPlaying = true;
					e.message.channel.sendMessage("@" + e.message.author.username + ": Cleared song queue", e.message.author);
				} else {
					e.message.channel.sendMessage("@" + e.message.author.username + ": No permission!", e.message.author);
				}
				break;

			case "pikaskip":
				if (admins.indexOf(e.message.author.id) != -1) {
					stopPlaying = true;
					songQueue.shift();
					setTimeout(play, 100, null, false, true);
					e.message.channel.sendMessage("@" + e.message.author.username + ": Skipped song", e.message.author);
				} else {
					e.message.channel.sendMessage("@" + e.message.author.username + ": No permission!", e.message.author);
				}

				break;

			case "help":
				e.message.channel.sendMessage("Syntax:" +
					"\n```Normal commands:" +
					"\n* !pikayt [song] - Request a song by URL or name (youtube search) - NOW WITH SOUNDCLOUD SUPPORT" +
					"\n* !pikaqueue - See the songs currently in the queue" +
					"\nAdmin commands:" +
					"\n* !pikajoin - Bot will join the voice room you are in (and stop the song that is playing if it's in a different one)" +
					"\n* !pikaplay - Play the next song in the queue (if there is one). If one is playing, nothing will happen." +
					"\n* !pikastop - Stop the song playing (next play will go to the next song in the queue)" +
					"\n* !pikaleave - Leave all voice channels" +
					"\n* !pikaclear - Clear the song queue" +
					"\n* !pikaskip - Skip the current song and play the next one in the queue (if there is one)" +
					"\n* !pikalock - Lock the queue so no new songs may be added (useful when planning a bot restart)" +
					"\n* !pikaunlock - Unlock the queue so new songs may be added" +
					"\nOwner commands:" +
					"\n* !pikaadmin [userid] - Sets a userid as a temporary admin until bot restart" +
					"\n* !pikapleb [userid] - Temporarily removes a userid from admins until restart```");
				break;

			case "pikaqueue":
				if (songQueue.length > 0) {
					e.message.channel.sendMessage("Queue:\n```* " +
						songQueue.map(elem => {return elem.name}).join("\n* ") +
						"```");
				} else {
					e.message.channel.sendMessage("The queue is empty!");
				}
				break;

			case "pikalock":
				if (admins.indexOf(e.message.author.id) != -1) {
					queueLocked = true;
					e.message.channel.sendMessage("@" + e.message.author.username + ": Locked queue!", e.message.author);
				} else {
					e.message.channel.sendMessage("@" + e.message.author.username + ": No permission!", e.message.author);
				}
				break;

			case "pikaunlock":
				if (admins.indexOf(e.message.author.id) != -1) {
					queueLocked = false;
					e.message.channel.sendMessage("@" + e.message.author.username + ": Unlocked queue!", e.message.author);
				} else {
					e.message.channel.sendMessage("@" + e.message.author.username + ": No permission!", e.message.author);
				}
				break;

			case "pikaadmin":
				if (e.message.author.id == "95454946421379072") {
					var newAdmin = content.substring(beginArgs + 1);
					admins.push(newAdmin);
					e.message.channel.sendMessage("@" + e.message.author.username + ": Added " + newAdmin + " as a temporary admin!", e.message.author);
				} else {
					e.message.channel.sendMessage("@" + e.message.author.username + ": No permission!", e.message.author);
				}
				break;

			case "pikapleb":
				if (e.message.author.id == "95454946421379072") {
					var newPleb = content.substring(beginArgs + 1);
					admins = admins.filter(elem => elem != newPleb)
					e.message.channel.sendMessage("@" + e.message.author.username + ": Removed " + newPleb + " from admins temporarily!", e.message.author);
				} else {
					e.message.channel.sendMessage("@" + e.message.author.username + ": No permission!", e.message.author);
				}
				break;

			default:
				console.log("Unknown command: " + command)
		}
	}

	//if (e.message.content == "ping") {
		//e.message.channel.sendMessage("pong");
	//}
});

var stopPlaying = false;
function play(file, voiceConnectionInfo, forcePlay) {
	if (file)
		songQueue.push(file);
	
	if (playing && !forcePlay)
		return;
	
	playing = true;

	stopPlaying = false;

	file = songQueue[0];

	if (!file)
		return;

	var ffProc = new ffmpeg(file.path)
		.native()
		.format("s16le")
		.audioFrequency(48000)
		.audioChannels(1);
	var ff = ffProc.pipe();

	var options = {
		frameDuration: 60,
		sampleRate: 48000,
		channels: 1,
		float: false,
		multiThreadedVoice: true
	};

	var readSize = 48 * 60 * 2 * 1;

	var actuallyDecoding = false;

	var encoder;

	currSpeakingChannel.sendMessage("Now playing: " + file.name);

	ff.on('readable', function() {
		if (actuallyDecoding) return;

		if(!client.VoiceConnections.length) {
			return console.log("Voice not connected");
		}

		if(!voiceConnectionInfo) {
			// get first if not specified
			voiceConnectionInfo = client.VoiceConnections[0];
		}

		var voiceConnection = voiceConnectionInfo.voiceConnection;

		encoder = voiceConnection.getEncoder(options);
		encoder.onNeedBuffer = function() {
			var chunk = ff.read(readSize);
			if(chunk) actuallyDecoding = true;
			if(chunk === null || stopPlaying) {
				if (stopPlaying) {
					playing = false;
					ffProc.on('error', function() {
						console.log("Killed FFMpeg");
					});
					ffProc.kill();
					encoder.kill();
				}
				return;
			}
			var sampleCount = readSize / 1 / 2;
			encoder.enqueue(chunk, sampleCount);
		};
		encoder.onNeedBuffer();


	});

	ff.on('end', () => {
		console.log("ENDED");
		if (!stopPlaying) {
			ffProc.on('error', function() {
				console.log("Killed FFMpeg");
			});
			ffProc.kill();
			encoder.kill();

			songQueue.shift();
			if (songQueue.length > 0) {
				setTimeout(play, 0, null, false, true);
			} else {
				playing = false;
			}
		}
	});
}
