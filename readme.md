# phantastic

get a list of website resources via phantomjs

## install

```
npm install phantastic
```

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

## data 

data is an array of resource object. they look like this

``` javascript
[{
	url: 'https://www.example.org/resource',
	domain: 'www.example.org',
	size: 2440,
	time: 87,
	content: 'mime/type' 
}]
```

