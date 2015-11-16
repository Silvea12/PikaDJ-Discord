var cp = require('child_process'),
	request = require('request'),
	fs = require('fs');

var allowedDomains = [
	"youtube.com",
	"soundcloud.com"
];

module.exports = function(query, callback) {
	var proc = cp.spawnSync("youtube-dl",
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
	var data = proc.stdout.toString().split("\n");
	var vidData = JSON.parse(data[1]);

	var file = vidData.requested_formats[vidData.requested_formats.length - 1];
	var filepath = "/home/silvea/Music/DiscordRequests/" + vidData.id + "." + file.ext;

	console.log(vidData);

	if (vidData.duration > 60*15) {
		return callback({error: "Sorry, but " + data[0] + " is too long!"});
	}

	fs.access(filepath, fs.F_OK, function(err) {
		if (err) {
			fstream = fs.createWriteStream("/home/silvea/Music/DiscordRequests/" + vidData.id + "." + file.ext);
			request.get(file.url).pipe(fstream);
			fstream.on('close', () => callback({path: filepath, name: data[0], albumArt: vidData.thumbnail}))
		} else {
			callback && callback({path: filepath, name: data[0], albumArt: vidData.thumbnail});
		}
	});

	return data[0];
};
