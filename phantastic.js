
// require node modules
var exec = require("child_process").exec;
var path = require("path");
var url = require("url");

// require npm modules
var phantomjs = require("phantomjs");
var lrufiles = require("lru-files");
var validurl = require("valid-url");
var request = require("request");
var crypto = require("crypto");
var moment = require("moment");
var debug = require("debug")("phantastic");
var tmp = require("tmp");

// set script path
phantomjs.script = path.resolve(__dirname, "phantom.js");

function phantastic(opts){
	if (!(this instanceof phantastic)) return new phantastic(opts);

	this.opts = opts;
	
	// implement cache
	this.cache = (!opts.cache) ? null : new lrufiles(opts.cache);
	if (this.cache) debug("using cache");
	
	// implement queue
	this.queue = {};

	return this;
};

// create hash in base36
phantastic.prototype._hash = function(str){
	return parseInt(crypto.createHash("sha1").update(str).digest('hex'),16).toString(36);
};

phantastic.prototype._cached = function(h, fn){
	var self = this;
	
	// check if cache is active
	if (!self.cache) return fn(null);

	// check cache
	debug("checking cache for %s", h);
	self.cache.check(h, function(success){
		if (!success) return fn(null);
		
		debug("retrieving %s from cache", h);
		self.cache.get(h, function(err, buffer){
			if (err) return fn(null);
			
			// try to parse data buffer
			try {
				var data = JSON.parse(buffer);
			} catch(e) {
				return fn(null);
			}
			
			fn(data);
			
		});
		
	});
	
};

// cache data for hash, if there is data
phantastic.prototype._cache = function(h, data, fn){
	var self = this;
	if (data) debug("caching %s", h) || self.cache.add(h, new Buffer(JSON.stringify(data)));
	fn(null);
};

phantastic.prototype.fetch = function(u, fn){
	var self = this;

	debug("fetching %s", u);

	// check url
	u = (validurl.is_web_uri(u));
	if (!u) return fn(new Error("invalid url"));
	
	// get hash
	var h = self._hash(u);

	// check if data is cached
	self._cached(h, function(data){
		
		// if cache is not empty, server
		if (data !== null) return fn(null, data);
		
		// check if this url is already queued, if so: add to callback queue
		if (self.queue.hasOwnProperty(h) && self.queue[h].length > 0) {
			self.queue[h].push(fn);
			return;
		};

		// create new callback queue
		self.queue[h] = [fn];
		
		// actually fetch page data
		self._fetch(u, function(err, result){
			
			// FIXME: put screenshot to permanent a place
			
			// put result to cache
			self._cache(h, result, function(){
				
				// iterate over callback queue
				while (self.queue[h].length > 0) self.queue[h].pop().call(self, err, result);

				// remove queue
				delete self.queue[h];
				
			});

		});
		
	});

};

phantastic.prototype._fetch = function(u, fn){

	// check url
	u = (validurl.is_web_uri(u));
	if (!u) return fn(new Error("invalid url"));
	
	// prefetch url and see if it's any good
	request({
		url: u,
		method: "head",
		headers: {
			"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.122 Safari/537.36"
		},
		// fix for UNABLE_TO_VERIFY_LEAF_SIGNATURE
		rejectUnauthorized: false
	}, function(err,resp,data){
		if (err) return fn(err);
		if (resp.statusCode !== 200) return fn(new Error("could not fetch url, status code "+resp.statusCode));
		if (!/^text\/html/.test(resp.headers["content-type"])) return fn(new Error("invalid content type: "+resp.headers["content-type"]));
		// FIXME: check body size

		// create tmp filename for screenshot
		tmp.tmpName(function(err, file_screenshot){
			if (err) return fn(err);
		
			// call phantomjs
			exec([phantomjs.path, "--ssl-protocol=any", "--ignore-ssl-errors=true", "--web-security=false", phantomjs.script, u, file_screenshot].join(" "), { timeout: 30000, maxBuffer: 67108864 }, function(err, stdout, stderr){
			
				// check exit code
				if (err && err.code === 255) return console.error(stdout, stderr) || fn(new Error("page could not be loaded"));
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
