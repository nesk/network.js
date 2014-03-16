define(['modules/http'], function(HttpModule) {

    'use strict';

    var LatencyModule = function(endpoint) {
        HttpModule.call(this, endpoint);

        this._requestsLeft = 0;
        this._latencies = [];
        this._tmpRequestData = null;

        this._initLatencyConfig();
    };

    var fn = LatencyModule.prototype = Object.create(HttpModule.prototype);

    fn.start = function() {
        // Set the number of requests required to establish the network latency. If the browser doesn't support the
        // Performance API, add a request that will be ignored to avoid a longer request due to a possible DNS fetch.
        this._requestsLeft = 5;
        window.performance || this._requestsLeft++;

        this._latencies = [];
        this._nextRequest();
    };

    fn._initLatencyConfig = function() {
        var _this = this;

        // Calculate the latency with the Performance API once the request is finished.
        if (window.performance) {
            this.on('xhr-load', function() {
                _this._getTimingEntry(function(entry) {
                    // The latency calculation differs between an HTTP and an HTTPS connection.
                    // See: http://www.w3.org/TR/resource-timing/#processing-model
                    var latency = !entry.secureConnectionStart
                                    ? entry.connectEnd - entry.connectStart
                                    : entry.secureConnectionStart - entry.connectStart;

                    _this._latencies.push(latency);
                });
            });
        }

        // If the browser doesn't support the Performance API, we fallback on a Datetime solution.
        else {
            this.on('xhr-loadstart', function() {
                // Save the starting timestamp.
                _this._tmpRequestData = (new Date()).getTime();
            });

            this.on('xhr-readystatechange', function() {
                // Ignore the first request (see the comments in the start() method) and calculate the latency if the
                // headers have been received.
                if (_this._requestsLeft < 5 && this.readyState == XMLHttpRequest.HEADERS_RECEIVED) {
                    // Save the difference between the first and the last timestamp.
                    _this._latencies.push((new Date()).getTime() - _this._tmpRequestData);
                }
            });
        }

        this.on('xhr-load', function() {
            // An anonymous callback is required to avoid the `this` key to be defined as the XHR object.
            _this._nextRequest();
        });
    };

    fn._nextRequest = function() {
        if (this._requestsLeft--) {
            this._newRequest('GET')._sendRequest();
        } else {
            var _this = this;

            // If all the requests have been executed, calculate the average latency. Since the _getTimingEntry() method
            // is asynchronous, wait for the next process tick to execute the _calculate() method, to be sure that all
            // the latencies have been retrieved.
            setTimeout(function() {
                _this._calculate();
            }, 0);
        }
    };

    fn._calculate = function() {
        var latencies = this._latencies,
            isThereAnyZeroLatency = false;
        
        // Get the average latency.
        var avgLatency = latencies.reduce(function(a, b) {
            // Check if there is any latency equal to zero.
            isThereAnyZeroLatency = isThereAnyZeroLatency || (a == 0 || b == 0);
            // Sum the current latency to the previous value.
            return a + b;
        }) / latencies.length;

        // If there is any zero latency, display a warning.
        console.warn([
            'At least one latency returned a zero value, this can be due to the configuration of your web server which',
            'is probably using persistant connections. Check the documentation to solve this problem.'
        ].join(' '));

        // Trigger the "end" event with the average latency and the latency list as parameters.
        this.trigger('end', [avgLatency, latencies]);
    };

    // Class exposure.
    return LatencyModule;

});