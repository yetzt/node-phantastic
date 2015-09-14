// phantomjs network script

var system = require('system');

// first command line argument is url
var url = system.args[1];
var screenshot = system.args[2];

// create client
var page = require('webpage').create();

// client settings
page.settings.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.122 Safari/537.36';
page.settings.webSecurityEnabled = false;
page.settings.resourceTimeout = 3000;
page.customHeaders = { "cache-control": "max-age=0" };
page.viewportSize = { width: 1280, height: 5120 };

// surpress a bunch of messages
page.onConsoleMessage = function(){};
page.onError = function(){};
page.onResourceError = function(){};
phantom.onError = function(){};

// log resource requests and responses
var resources = [];

// add request data to resources
page.onResourceRequested = function(request) {
	resources[request.id] = {
		url: request.url,
		start: request.time,
		method: request.method,
		response: false
	};
};

// add response data to resources
page.onResourceReceived = function (response) {
	resources[response.id].response = true;
	resources[response.id].status = response.status;
	resources[response.id].end = response.time;
	resources[response.id].url = response.url;
	if (response.contentType) resources[response.id].contenttype = response.contentType;
	if (response.bodySize) resources[response.id].size = response.bodySize;

	// add cookies to resources
	resources[response.id].cookies = response.headers.filter(function(header){
		return (header.name.toLowerCase() === "set-cookie");
	}).map(function(item){
		return item.value;
	}).join("\n").split(/[\r\n]+/g);
	if (resources[response.id].cookies.length === 1 && resources[response.id].cookies[0] === '') resources[response.id].cookies = null;
};

page.open(url, function (status) {

	// check if page could be opened, otherwise exit()
	if (status !== "success") {
		phantom.exit(-1);
		return;
	}

	// finalize page
	finalize();

});

// automatically finalize after 15 seconds
setTimeout(finalize, 15000);

var finalized = false;
function finalize(){

	// check if finalize has been called already
	if (finalized) return;
	finalized = true;

	// stop loading
	page.stop();
	
	// log results
	console.log(JSON.stringify(resources.filter(function(d){
		return (d !== null);
	})));

	// make screenshot if so desired
	if (screenshot) page.render(screenshot, 'png');

	// exit 
	phantom.exit(0);
};

