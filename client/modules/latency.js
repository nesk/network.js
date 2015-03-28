var HttpModule = require('./http'),
    Timing = require('../timing');

export default class LatencyModule extends HttpModule {

    constructor(options = {})
    {
        // We dont want any timeout during a latency calculation. Here we are cloning the options because we don't want
        // to alter the original ones.
        options = Object.assign(JSON.parse(JSON.stringify(options)), {
            delay: 0
        });

        // Call parent constructor.
        super.constructor('latency', options);

        // Define the object properties.
        this._requestsLeft = 0;
        this._latencies = [];
        this._requestID = 0;

        // Unique labels for each request, exclusively used to make measures.
        this._timingLabels = {
            start: null,
            end: null,
            measure: null
        };

        // Initiate the object.
        this._initLatencyConfig();
    }

    start()
    {
        // Set the number of requests required to establish the network latency. If the browser doesn't support the
        // Resource Timing API, add a request that will be ignored to avoid a longer request due to a possible
        // DNS/whatever fetch.
        this._requestsLeft = 5;
        Timing.supportsResourceTiming() || this._requestsLeft++;

        // Override the requesting value since a complete latency request consists off multiple ones.
        this._setRequesting(true);

        this._latencies = [];
        this._nextRequest();

        return this;
    }

    _initLatencyConfig()
    {
        var _this = this;

        // Calculate the latency with the Resource Timing API once the request is finished.
        if (Timing.supportsResourceTiming()) {
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

        // If the browser doesn't support the Resource Timing API, we fallback on a Datetime solution.
        else {
            var labels = this._timingLabels;

            // Set a mark when the request starts.
            this.on('xhr-loadstart', function() {
                Timing.mark(labels.start);
            });

            this.on('xhr-readystatechange', function() {
                // Ignore the first request (see the comments in the start() method) and calculate the latency if the
                // headers have been received.
                if (_this._requestsLeft < 5 && this.readyState == XMLHttpRequest.HEADERS_RECEIVED) {
                    // Save the timing measure.
                    Timing.mark(labels.end);
                    _this._latencies.push(Timing.measure(labels.measure, labels.start, labels.end));
                }
            });
        }

        this.on('xhr-load', function() {
            // An anonymous callback is required to avoid the `this` key to be defined as the XHR object.
            _this._nextRequest();
        });
    }

    _nextRequest()
    {
        if (this._requestsLeft--) {
            var reqID = this._requestID++;

            // Create unique timing labels for the new request.
            var labels = this._timingLabels;
            labels.start = 'latency-'+ reqID + '-start';
            labels.end = 'latency-'+ reqID + '-end';
            labels.measure = 'latency-'+ reqID + '-measure';

            // Create the new request and send it.
            this._newRequest('GET')._sendRequest();
        } else {
            var _this = this;

            // All the requests are finished, set the requesting status to false.
            this._setRequesting(false);

            // If all the requests have been executed, calculate the average latency. Since the _getTimingEntry() method
            // is asynchronous, wait for the next process tick to execute the _calculate() method, to be sure that all
            // the latencies have been retrieved.
            setTimeout(function() {
                _this._calculate();
            }, 0);
        }
    }

    _calculate()
    {
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
        isThereAnyZeroLatency && console.warn([
            'At least one latency returned a zero value, this can be due to the configuration of your web server which',
            'is probably using persistant connections. Check the documentation to solve this problem.'
        ].join(' '));

        // Trigger the "end" event with the average latency and the latency list as parameters.
        this.trigger('end', [avgLatency, latencies]);
    }

}
