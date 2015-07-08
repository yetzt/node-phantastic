# phantastic

get a list of website resources via phantomjs

## usage example

``` javascript
var phantastic = require("phantastic")({
	cache: {
		// see https://npmjs.com/package/lru-files
		dir: "/path/to/cache/dir",
		files: 100,
		size: "1 GB",
		age: "1 Day"
	}
});

// fetch single site
phantastic.fetch("https://www.example.com/", function(err, data){
	if (err) return console.log(err);
	console.log(data);
});
```

