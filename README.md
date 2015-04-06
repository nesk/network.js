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

// Access the latency module.
var latency = speed.module('latency');

// Listen for the "end" event which provides the calculated latencies.
latency.on('end', function(averageLatency, allLatencies) {
    // "allLatencies" is an array containing the five calculated latencies in
    // milliseconds. They're used to determine an average latency.
    console.log('end', averageLatency, allLatencies);
});

// Once all the configuration is done, start the requests for this module.
latency.start();

// It is possible to chain functions for all the modules, here's an example with the
// upload module.
speed.module('upload')
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
speed.module('upload').abort();

speed.module('download')
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

speed.module('download').abort();
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

## Contribution

> I want to contribute but I don't understand how the project is divided, where do I start?

The project is divided in two parts. One client and many servers (currently, there's only the PHP version). The goal is to provide a few servers for various platforms (PHP, Node, .Net, Python, etc...).

### Server

The server part has only one job: respond to the client. It must provide appropriate headers for the latency tests, configure the platform to allow large uploads and return large chunks of data for the download tests.

If you want to contribute by creating a server in any language or with any platform you want, here's some simple guidelines to help you:

* Don't let HTTP connections opened (disabled them, or use HTTP 1.0, the latest isn't recommended). The latency calculations are based on the time it takes for the client to establish an HTTP connection with the server, if a connection is still open you will get a 0 latency for each test.
* Disable every caching capabilities of client browsers or proxies. Take a look at the `Cache-Control` and `Pragma` headers.
* Disable all types of compression, like __gzip__.

You will need to handle a single endpoint, it must return an empty response with a `200` HTTP code when a `GET` request is made. At this point, latency calculations _should work_. Your server __must__ support binary file uploads on this endpoint, check your environment configuration if you have any issues.

Finally, the endpoint should return generated data when the client measures the download bandwidth. You can identify this scenario by checking if the `module` query parameter is equal to `"download"`.

The easiest way to generate some data is to return a simple string concatenated multiple times to finally get the appropriate size and return it to the client. If you can easily generate some random binary data, prefer this option. You should, by default, return a `20MB` size but the client can override this value by providing a size __in Bytes__ through the `size` query parameter. Since the client can define this value, make sure to define a maximum value, I recommend `200MB`.

That's it for the server part, [check my PHP implementation](server/server.php) if you need some context.

### Client

The client part is divided into many files that are compiled with [RequireJS](http://requirejs.org/). It is composed of one main class (`SpeedTest`) which is divided into modules: _latency_ (`LatencyModule`), _upload_ (`BandwidthModule`), _download_ (`BandwidthModule`). Each of them inherits from the _http_ module (`HttpModule`) which inherits from the _event dispatcher_ (`EventDispatcher`).

The `EventDispatcher` class provides the `on`, `off` and `trigger` methods which allows event management. I'm planning to replace this class by a specialized project like [EventEmitter](https://github.com/Wolfy87/EventEmitter) but it currently does the job.

The `HttpModule` class provides methods to handle networking management (only over HTTP, of course). Basically, you prepare a new request with the `_newRequest` method and you send it with `_sendRequest`. The goal with this class is to never expose the `XMLHttpRequest` instance until it has been sent, thus we can safely manage the request without any breaking code from the child modules. It also provides an `isRequesting` method to check if the module is currently making a request.

The `LatencyModule` and the `BandwidthModule` classes make all the calculations and trigger the events. The code is correctly commented so it's up to you to understand how it works, it shouldn't be very difficult.

Finally, the `SpeedTest` class initiates all the modules and makes them accessible through the `module` method (this will probably change). Like the `HttpModule` class, it provides an `isRequesting` method to check if __any__ module is currently making a request.

## License

This project is licensed under [the MIT license](LICENSE), check [TLDRLegal for details](https://tldrlegal.com/license/mit-license).

[1]: https://github.com/Fyrd/caniuse/blob/master/features-json/xhr2.json#L22
