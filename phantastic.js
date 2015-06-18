
// require node modules
var exec = require("child_process").exec;
var path = require("path");
var url = require("url");

// require npm modules
var phantomjs = require("phantomjs");
var validurl = require("valid-url");
var request = require("request");
var moment = require("moment");
var tmp = require("tmp");

// set script path
phantomjs.script = path.resolve(__dirname, "phantom.js");

function phantastic(){
	if (!(this instanceof phantastic)) return new phantastic();
	return this;
};

phantastic.prototype.fetch = function(u, fn){

	// check url
	u = (validurl.is_web_uri(u));
	if (!u) return fn(new Error("invalid url"));
	
	// prefetch url and see if it's any good
	request({
		url: u,
		method: "head",
		headers: {
			"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.122 Safari/537.36"
		}
	}, function(err,resp,data){
		if (err) return fn(err);
		if (resp.statusCode !== 200) return fn(new Error("could not fetch url, status code "+resp.statusCode));
		if (!/^text\/html/.test(resp.headers["content-type"])) return fn(new Error("invalid content type: "+resp.headers["content-type"]));
		// FIXME: check body size

		// create tmp filename for screenshot
		tmp.tmpName(function(err, file_screenshot){
			if (err) return fn(err);
		
			// call phantomjs
			exec([phantomjs.path, "--ignore-ssl-errors=true", "--web-security=false", phantomjs.script, u, file_screenshot].join(" "), { timeout: 30000, maxBuffer: 67108864 }, function(err, stdout, stderr){
			
				// check exit code
				if (err && err.code === 255) return fn(new Error("page could not be loaded"));
				if (err) return fn(err);
			
				// try to parse output
				try {
					var data = JSON.parse(stdout.split(/[\r\n]+/g).shift())
				} catch (err) {
					return fn(err);
				}
			
				// refine data
				data = data.filter(function(item){
					// filter items without response or non-200 status code
					return (item.status === 200 && item.response === true);
				}).map(function(item){
					return {
						url: item.url,
						domain: url.parse(item.url, false).host,
						size: (item.size) ? item.size : null,
						time: Math.abs(moment(item.start).valueOf()-moment(item.end).valueOf()),
						content: (item.contenttype) ? item.contenttype.split(/;/g).shift() : null,
					}
				});

				// call back with data and screenshot
				fn(null, {
					url: u,
					domain: url.parse(u, false).host,
					data: data,
					screenshot: file_screenshot
				});
			
			});
		
		});

	});
	
};

module.exports = phantastic;
