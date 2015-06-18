# phantastic

retrieve a list of resources for a website

## usage example

``` javascript
var phantastic = require("./phantastic.js")();

// fetch single site
phantastic.fetch("https://www.example.com/", function(err, data){
	if (err) return console.log(err);
	console.log(data);
});
```

