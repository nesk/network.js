# SpeedTest (under development)

A __JavaScript__ library to measure various aspects of a connection. It can accurately estimate a bandwidth/latency between a client (using a web browser) and a server (running a specific script).

## Compatibility

SpeedTest is based on two browser features: [Resource Timing](http://caniuse.com/#feat=resource-timing) and [XMLHttpRequest (v2)](http://caniuse.com/#feat=xhr2). While the first one [can be polyfilled](client/timing.js), the second one is a requirement.

Thus, SpeedTest should be compatible with:

| Browser              | Partial support (polyfill) | Native support |
| -------------------- | :-------------------:      | :------------: |
| IE 10+               |                            | ✔              |
| Firefox 35+          |                            | ✔              |
| [Chrome 29+][1]      |                            | ✔              |
| Opera 15+            |                            | ✔              |
| Android Browser 4.4+ |                            | ✔              |
|                      |                            |                |
| Safari 5+            | ✔                          |                |
| iOS Safari 5.1+      | ✔                          |                |
| [Firefox 12+][1]     | ✔                          |                |
| Opera 12.1+          | ✔                          |                |
| Android Browser 3+   | ✔                          |                |

Latency measures can be __very far__ from reality if the browser doesn't have native support and uses the provided polyfill.

## Caveats

* Latency measures never return any results with Firefox.
* Chrome cannot upload a __~128 MB__ file, which will mainly affect fiber users.
* Currently, the client and the server must be on the same domain or measures can't be done due to the [same-origin policy](http://en.wikipedia.org/wiki/Same-origin_policy).

## How to use

```js
// Create a new SpeedTest instance by providing an optional object.
// N.B. The following options are the default ones.
var speed = new SpeedTest({
    endpoint: './speedtest.php', // Where is located your `speedtest.php` file.
    delay: 8000, // The delay while you want to take measures for a bandwidth measure.

    // Defines the amount of data to initially use for each bandwidth module.
    dataSize: {
        upload: 2 * 1024 * 1024, // 2 MB
        download: 10 * 1024 * 1024, // 10 MB

        // If the measure period can't reach the delay defined in the options, the
        // data amount is increased by the multiplier value.
        multiplier: 2
    },

    // Defines how many measures should be returned by the latency module and
    // how much attempts to get a valid value should be done for each measure.
    latency: {
        measures: 5,
        attempts: 3
    }
});

// Listen for the "end" event which provides the calculated latencies.
speed.latency.on('end', function(averageLatency, allLatencies) {
    // "allLatencies" is an array containing the five calculated latencies in
    // milliseconds. They're used to determine an average latency.
    console.log('end', averageLatency, allLatencies);
});

// Once all the configuration is done, start the requests for this module.
speed.latency.start();

// It is possible to chain functions for all the modules, here's an example with the
// upload module.
speed.upload
     .on('start', function(dataSize) {
         console.log('start', dataSize);
     })
     .on('progress', function(averageSpeed, instantSpeed) {
         // Every bandwidth measure are in Mega BYTES per second!
         console.log('progress', averageSpeed, instantSpeed);
     })
     .on('restart', function(dataSize) {
         // The restart event is triggered when the module didn't have time
         // (according to the `delay` option) to take all the measures. A new
         // request will start with data size increased by the multiplier value.
         console.log('restart', dataSize);
     })
     .on('end', function(averageSpeed, allInstantSpeeds) {
         console.log('end', averageSpeed, allInstantSpeeds);
     })
     .start();

// You can also cancel a request (except for the "latency" module).
speed.upload.abort();

speed.download
     .on('start', function(dataSize) {
         console.log('start', dataSize);
     })
     .on('progress', function(averageSpeed, instantSpeed) {
         console.log('progress', averageSpeed, instantSpeed);
     })
     .on('restart', function(dataSize) {
         console.log('restart', dataSize);
     })
     .on('end', function(averageSpeed, allInstantSpeeds) {
         console.log('end', averageSpeed, allInstantSpeeds);
     })
     .start();

speed.download.abort();
```

## Compilation

To compile the project, install the latest version of [Node](http://nodejs.org/) and run these commands inside a terminal:

```shell
git clone https://github.com/Nesk/SpeedTest.git
cd SpeedTest
npm install
npm run build
```

There's also a `watch` script which compiles the project whenever a file is changed:

```shell
npm run watch
```

To check if the project passes all the tests, run:

```shell
npm test
```

## Contribution

Read the [CONTRIBUTING](CONTRIBUTING.md) file.

## License

This project is licensed under [the MIT license](LICENSE), check [TLDRLegal for details](https://tldrlegal.com/license/mit-license).

[1]: https://github.com/Fyrd/caniuse/blob/master/features-json/xhr2.json#L22
