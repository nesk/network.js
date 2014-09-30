_The v2 of SpeedTest is currently under development (with a very slooooow progression, [you're free to help](#contribution) if you want it to progress faster), if you try to use it now you will probably hate me, I suggest you to wait for a first release. Because it will be a v2, there was a v1 but I do not recommend you to use it too, it's probably the most unstable code I've ever written and the v2 is a complete rewrite._

# SpeedTest

A __JavaScript-only__ script which can measures various aspects of your current connection. It can estimate your upload/download bandwidth and your latency. Keep in mind that these estimations are only valid on the HTTP(S) protocol and also between the server and the client you use for testing, it may change with another protocol/server/client.

## How to use

```javascript
// Create a new SpeedTest instance by providing an optional object.
var speed = new SpeedTest({
    endpoint: './speedtest.php', // Where is located your `speedtest.php` file.
    delay: 8 // For each bandwidth measure, the delay while you want to take measures.
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
     .on('progress', function(averageSpeed, instantSpeed) {
         console.log('progress', averageSpeed, instantSpeed);
     })
     .on('restart', function(dataSize) {
         // The restart event is triggered when the module didn't have time
         // (according to the `delay` option) to take all the measures. A new
         // request will start with data length increased by 2.
         console.log('restart', dataSize);
     })
     .on('end', function(averageSpeed, allInstantSpeeds) {
         console.log('end', averageSpeed, allInstantSpeeds);
     })
     .start();

speed.module('download')
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
```

## Compilation

To compile the project, install the latest version of [Node](http://nodejs.org/) and run these commands inside a terminal:

```
git clone https://github.com/Nesk/SpeedTest.git
cd SpeedTest
npm install
npm run build
```

There's also a `watch` task which compiles the project whenever a file is changed:

    gulp watch

## Contribution

> I want to contribute but I don't understand how the project is divided, where do I start?

The project is divided in two parts. One client and many servers (currently, there's only the PHP version). The goal is to provide a few servers for various platforms (PHP, Node, .Net, Python, etc...).

The server part has only one job: respond to the client. It has to provide correct headers for the latency tests (check the code), configure the platform to allow large uploads and return large chunks of data for the download tests.

The client part is divided into many files that are compiled with [RequireJS](http://requirejs.org/). It is composed of one main class (`SpeedTest`) which is divided into modules: _latency_ (`LatencyModule`), _upload_ (`BandwidthModule`), _download_ (`BandwidthModule`). Each of them inherits from the _http_ module (`HttpModule`) which inherits from the _event dispatcher_ (`EventDispatcher`).

The `EventDispatcher` class provides the `on`, `off` and `trigger` methods which allows event management. I'm planning to replace this class by a specialized project like [EventEmitter](https://github.com/Wolfy87/EventEmitter) but it currently does the job.

The `HttpModule` class provides methods to handle networking management (only over HTTP, of course). Basically, you prepare a new request with the `_newRequest` method and you send it with `_sendRequest`. The goal with this class is to never expose the `XMLHttpRequest` instance until it has been sent, thus we can safely manage the request without any breaking code from the child modules. It also provides an `isRequesting` method to check if the module is currently making a request.

The `LatencyModule` and the `BandwidthModule` classes make all the calculations and trigger the events. The code is correctly commented so it's up to you to understand how it works, it shouldn't be very difficult.

Finally, the `SpeedTest` class initiates all the modules and makes them accessible through the `module` method (this will probably change). Like the `HttpModule` class, it provides an `isRequesting` method to check if __any__ module is currently making a request.

## License

This project is licensed under [the MIT license](LICENSE), check [TLDRLegal for details](https://tldrlegal.com/license/mit-license).
