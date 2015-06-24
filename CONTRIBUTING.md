Before you submit any pull request, please check if your code can pass all the tests by running:

```shell
npm test
```

If your code contains new features, add the corresponding tests.

# Architecture

> I want to contribute but I don't understand how the project is organized, where do I start?

The project is divided in two parts. One client and many servers (currently, there's only the PHP version). The goal is to provide a few servers for various platforms (PHP, Node, .Net, Python, etc...).

## Server

The server part has only one job: respond to the client. It must provide appropriate headers for the latency tests, configure the platform to allow large uploads and return large chunks of data for the download tests.

If you want to contribute by creating a server in any language or with any platform you want, here's some simple guidelines to help you:

* Don't let HTTP connections opened (disabled them, or use HTTP 1.0, the latest isn't recommended). The latency calculations are based on the time it takes for the client to establish an HTTP connection with the server, if a connection is still open you will get a 0 latency for each test.
* Disable every caching capabilities of client browsers or proxies. Take a look at the `Cache-Control` and `Pragma` headers.
* Disable all types of compression, like __gzip__.

You will need to handle a single endpoint, it must return an empty response with a `200` HTTP code when a `GET` request is made. At this point, latency calculations _should work_. Your server __must__ support binary file uploads on this endpoint, check your environment configuration if you have any issues.

Finally, the endpoint should return generated data when the client measures the download bandwidth. You can identify this scenario by checking if the `module` query parameter is equal to `"download"`.

The easiest way to generate some data is to return a simple string concatenated multiple times to finally get the appropriate size and return it to the client. If you can easily generate some random binary data, prefer this option. You should, by default, return a `20MB` size but the client can override this value by providing a size __in Bytes__ through the `size` query parameter. Since the client can define this value, make sure to define a maximum value, I recommend `200MB`.

That's it for the server part, [check my PHP implementation](server/server.php) if you need some context.

## Client

The client part is written in ES6 and transpiled to ES5 using [Babel](http://babeljs.io/). It is composed of one main class (`Network`) which is divided into modules: _latency_ (`LatencyModule`), _upload_ (`BandwidthModule`), _download_ (`BandwidthModule`). Each of them inherits from the _http_ module (`HttpModule`) which inherits from the _event dispatcher_ (`EventDispatcher`).

The `EventDispatcher` class provides the `on`, `off` and `trigger` methods which allows event management.

The `HttpModule` class provides methods to handle networking management (only over HTTP, of course). Basically, you prepare a new request with the `_newRequest` method and you send it with `_sendRequest`. The goal with this class is to never expose the `XMLHttpRequest` instance until it has been sent, thus we can safely manage the request without any breaking code from the child modules. It also provides an `isRequesting` method to check if the module is currently making a request.

The `LatencyModule` and the `BandwidthModule` classes make all the calculations and trigger the events. The code is correctly commented so it's up to you to understand how it works, it shouldn't be very difficult.

These last two modules depend on the `Timing` class. It allows to check for Resource Timing support and provides two methods used to make measures based on the Performance API which fallback to DateTime calculations if the browser doesn't have the required APIs.

Finally, the `Network` class initiates all the modules and makes them accessible through the `module` method (this will probably change). Like the `HttpModule` class, it provides an `isRequesting` method to check if __any__ module is currently making a request.
