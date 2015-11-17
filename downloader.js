var cp = require('child_process'),
	request = require('request'),
	fs = require('fs');

var allowedDomains = [
	"youtube.com",
	"soundcloud.com"
];

module.exports = function(query, callback) {
	var proc = cp.spawn("youtube-dl",
		[
			"-o",
			"%(title)s",
			"--no-playlist",
			"-j",
			"--get-filename",
			"--no-check-certificate",
			"--no-playlist",
			allowedDomains.some(elem => new RegExp("^https?://(www\\.)?" + elem + "/", "i").test(query)) ? query : "ytsearch:" + query
		]);

	var output = ""
	proc.stdout.on('data', data => {
		output += data.toString();
	});

	proc.on('close', code => {
		var data = output.split("\n");
		var vidData = JSON.parse(data[1]);

		var allowedFormats = vidData.formats.filter(elem => elem.url.indexOf("rtmp") != 0);
		var file = allowedFormats[allowedFormats.length - 1];
		var wantedFile = allowedFormats.find(elem => elem.format.toLowerCase().indexOf("audio") != -1);
		if (wantedFile)
			file = wantedFile;

		var filepath = "/home/silvea/Music/DiscordRequests/" + vidData.id + "." + file.ext;

		console.log("Title:\n" + data[0] + "\nFilename: " + vidData.id + "." + file.ext + "\nDuration: " + vidData.duration + "\nURL: " + vidData.webpage_url + "\nThumbnail: " + vidData.thumbnail);

		if (vidData.duration > 60*15) {
			return callback({error: "Sorry, but " + data[0] + " is too long!"});
		}

		fs.access(filepath, fs.F_OK, function(err) {
			if (err) {
				fstream = fs.createWriteStream("/home/silvea/Music/DiscordRequests/" + vidData.id + "." + file.ext);
				request.get(file.url).pipe(fstream);
				fstream.on('close', () => callback({path: filepath, name: data[0], albumArt: vidData.thumbnail}));
			} else {
				callback && callback({path: filepath, name: data[0], albumArt: vidData.thumbnail});
			}
		});
	});
};
