(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.SpeedTest = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var LatencyModule = require('./modules/latency'),
    BandwidthModule = require('./modules/bandwidth');

var SpeedTest = module.exports = function(options) {
    // Initialize the modules
    this._modules = {};
    this._setModule('latency', new LatencyModule(options))
        ._setModule('upload', new BandwidthModule('upload', options))
        ._setModule('download', new BandwidthModule('download', options));
};

var fn = SpeedTest.prototype;

fn.module = function(name) {
    return this._modules[name] || null;
};

fn.isRequesting = function() {
    var modules = this._modules,
        requesting = false;

    for (var i in modules) {
        if (modules.hasOwnProperty(i)) {
            requesting = requesting || modules[i].isRequesting();
        }
    }

    return requesting;
};

fn._setModule = function(name, object) {
    var _this = this;

    if (object) {
        this._modules[name] = object.on('_newRequest', function() {
            return !_this.isRequesting();
        });
    }

    return this;
};

},{"./modules/bandwidth":3,"./modules/latency":5}],2:[function(require,module,exports){
'use strict';

var EventDispatcher = module.exports = function() {
    this._events = {}; // Contains all the event callbacks, organized by event types.
};

var fn = EventDispatcher.prototype;

fn.on = function(eventType, callback) {
    var events = this._events[eventType];

    // If inexistant, create the array used to store the callbacks.
    if (!events) {
        events = this._events[eventType] = [];
    }

    // If the callback isn't already registered, store it.
    if (!~events.indexOf(callback)) {
        events.push(callback);
    }

    return this;
};

fn.off = function(eventType, callback) {
    var events = this._events[eventType];

    // If there is no specified callback, simply delete all the callbacks binded to the provided event type.
    if (typeof callback == 'undefined' && events) {
        delete this._events[eventType];
    } else {
        var eventIndex = events ? events.indexOf(callback) : -1;

        // If the callback is registered, remove it from the array.
        if (~eventIndex) {
            events.splice(eventIndex, 1);
        }
    }

    return this;
};

fn.trigger = function(eventType, extraParameters, context) {
    var events = this._events[eventType] || [];
    extraParameters = extraParameters || [];

    // A callback can return a boolean value which will be logically compared to the other callbacks values before
    // being returned by the trigger() method. This allows a callback to send a "signal" to the caller, like
    // cancelling an action.
    var returnValue = true;

    events.forEach(function(callback) {
        // A callback must explicitly return false if it wants the trigger() method to return false, undefined will
        // not work. This avoids crappy callbacks to mess up with the triggering system.
        var value = callback.apply(this, extraParameters);
            value = value !== false ? true : false;

        returnValue = returnValue && value; // Compare the result of the callback to the actual return value.
    }, context);

    return returnValue;
};

},{}],3:[function(require,module,exports){
'use strict';

var HttpModule = require('./http'),
    Timing = require('../timing'),
    Utilities = require('../utilities');

var BandwidthModule = module.exports = function(loadingType, options) {
    var validLoadingTypes = ['upload', 'download'];
    loadingType = (~validLoadingTypes.indexOf(loadingType)) ? loadingType : 'download';

    // Define default options and override them by the ones provided at instanciation.
    options = Utilities.extend({
        dataSize: {
            upload: 2 * 1024 * 1024, // 2 MB
            download: 10 * 1024 * 1024, // 10 MB
            multiplier: 2
        }
    }, options);

    // Call parent constructor.
    HttpModule.call(this, loadingType, options);

    // Define the object properties.
    this._loadingType = loadingType;

    this._intendedEnd = false;
    this._isRestarting = false;

    this._lastLoadedValue = null;
    this._speedRecords = [];
    this._avgSpeed = null;

    this._requestID = 0;
    this._progressID = 0;

    // Unique labels for each request, exclusively used to make measures.
    this._timingLabels = {
        start: null,
        progress: null,
        end: null,
        measure: null
    };

    // Initiate the object.
    this._initBandwidthConfig();
};

var fn = BandwidthModule.prototype = Object.create(HttpModule.prototype);

fn.start = function() {
    var loadingType = this._loadingType,
        dataSize = this._options.dataSize,
        reqID = this._requestID++;

    this._intendedEnd = false;
    this._lastLoadedValue = null;
    this._speedRecords = [];

    // Trigger the start event.
    if (!this._isRestarting) {
        this.trigger('start', [(loadingType == 'upload') ? dataSize.upload : dataSize.download]);
    }

    // Create unique timing labels for the new request.
    var labels = this._timingLabels;
    labels.start = loadingType +'-'+ reqID + '-start';
    labels.progress = loadingType +'-'+ reqID + '-progress';
    labels.end = loadingType +'-'+ reqID + '-end';
    labels.measure = loadingType +'-'+ reqID + '-measure';

    // Generate some random data to upload to the server. Here we're using a Blob instead of an ArrayBuffer because
    // of a bug in Chrome (tested in v33.0.1750.146), causing a freeze of the page while trying to directly upload
    // an ArrayBuffer (through an ArrayBufferView). The freeze lasts nearly 4.5s for 10MB of data. Using a Blob
    // seems to solve the problem.
    var blob = (loadingType == 'upload') ? new Blob([new ArrayBuffer(dataSize.upload)]) : null;

    var type = (loadingType == 'download') ? 'GET' : 'POST';

    // Initiate and send a new request.
    this._newRequest(type, {
        size: dataSize.download
    })._sendRequest(blob);
};

fn.abort = function() {
    this._intendedEnd = true;
    return this._abort();
};

fn._initBandwidthConfig = function() {
    var _this = this,
        loadingType = this._loadingType,
        eventsPrefix = (loadingType == 'upload') ? 'xhr-upload-' : 'xhr-';

    this.on(eventsPrefix +'loadstart', function() {
        Timing.mark(_this._timingLabels.start);
    });

    this.on(eventsPrefix +'progress', function(event) {
        _this._progress(event);
    });

    this.on(eventsPrefix +'timeout', function() {
        _this._timeout();
    });

    this.on(eventsPrefix +'loadend', function() {
        _this._end();
    });
};

fn._progress = function(event) {
    var labels = this._timingLabels,
        progressID = this._progressID++,
        markLabel = labels.progress +'-'+ progressID,
        loaded = event.loaded;

    Timing.mark(markLabel);

    // Measure the average speed (B/s) since the request started.
    var avgMeasure = Timing.measure(
            labels.measure +'-avg-'+ progressID,
            labels.start,
            markLabel
        ),
        avgSpeed = loaded / avgMeasure * 1000;

    var instantSpeed;

    if (!this._lastLoadedValue) { // We are executing the first progress event of the current request.
        instantSpeed = avgSpeed; // The instant speed of the first progress event is equal to the average one.
    } else {
        // Measure the instant speed (B/s). Which defines the speed between two progress events.
        var instantMeasure = Timing.measure(
            labels.measure +'-instant-'+ progressID,
            // Set the mark of the previous progress event as the starting point.
            labels.progress +'-'+ (progressID - 1),
            markLabel
        );
        instantSpeed = (loaded - this._lastLoadedValue) / instantMeasure * 1000;
    }

    // Save the `loaded` property of the event for the next progress event.
    this._lastLoadedValue = loaded;

    // Save the measures.
    this._avgSpeed = avgSpeed;
    this._speedRecords.push(instantSpeed);

    this.trigger('progress', [avgSpeed, instantSpeed]);
};

fn._timeout = function() {
    this._intendedEnd = true;
};

fn._end = function() {
    // A timeout or an abort occured, bypass the further requests and trigger the "end" event.
    if (this._intendedEnd) {
        this._isRestarting = false;
        this.trigger('end', [this._avgSpeed, this._speedRecords]);
    }

    // The request ended to early, restart it with an increased data size.
    else {
        var loadingType = this._loadingType,
            dataSize = this._options.dataSize;

        dataSize.upload *= dataSize.multiplier;
        dataSize.download *= dataSize.multiplier;

        this.trigger('restart', [(loadingType == 'upload') ? dataSize.upload : dataSize.download]);

        this._isRestarting = true;
        this.start();
    }
};

},{"../timing":6,"../utilities":7,"./http":4}],4:[function(require,module,exports){
'use strict';

var EventDispatcher = require('../event-dispatcher'),
    Utilities = require('../utilities');

var HttpModule = module.exports = function(moduleName, options) {
    // Call parent constructor.
    EventDispatcher.call(this);

    // Define default options and override them by the ones provided at instanciation.
    options = Utilities.extend({
        endpoint: './speedtest.php',
        delay: 8000
    }, options);

    // Define the object properties.
    this._options = options;
    this._moduleName = moduleName;
    this._xhr = null;
    this._lastURLToken = null;

    this._requestingOverridden = false;
    this._requesting = false;

    // Initiate the object.
    this._initHttpConfig();
};

var fn = HttpModule.prototype = Object.create(EventDispatcher.prototype);

fn.isRequesting = function() {
    return this._requesting;
};

fn._initHttpConfig = function() {
    var _this = this;

    // Each time a request starts or ends, set the requesting value unless it has been overridden with the
    // _setRequesting() method.
    var loadstart = function() {
        if (!_this._requestingOverridden) {
            _this._requesting = true;
        }
    };

    this.on('xhr-loadstart', loadstart);
    this.on('xhr-upload-loadstart', loadstart);

    var loadend = function() {
        if (!_this._requestingOverridden) {
            _this._requesting = false;
        }
    };

    this.on('xhr-loadend', loadend);
    this.on('xhr-upload-loadend', loadend);
};

fn._newRequest = function(httpMethod, queryParams) {
    // Check if a callback binded to the "_newRequest" event returns false, if it's the case, cancel the request
    // creation. If the requesting status has been overridden, there's no need to cancel the request since the user
    // should know what he's doing.
    if (!this.trigger('_newRequest') && !this._requestingOverridden) {
        console.warn('To ensure accurate measures, you can only make one request at a time.');
        return this;
    }

    var _this = this,
        options = this._options,
        xhr = new XMLHttpRequest(),
        validHttpMethods = ['GET', 'POST'];

    // Prepare the new request.
    if (!~validHttpMethods.indexOf(httpMethod)) {
        console.warn('The HTTP method must be GET or POST.');
        return this;
    }

    queryParams = queryParams || {};

    // Generate an URL token to avoid any caching issues. This token will also allow to identify the request in the
    // Resource Timing entries.
    this._lastURLToken = 'speedtest-'+ (new Date).getTime();

    // Append the query parameters.
    var url = options.endpoint;
        url += (~url.indexOf('?') ? '&' : '?') + 'module=' + this._moduleName;

    Object.keys(queryParams).forEach(function(param) {
        url += '&' + param + '=' + encodeURIComponent(queryParams[param]);
    });

    url += '&' + this._lastURLToken;

    xhr.open(httpMethod, url);

    // Define the timeout of the request.
    xhr.timeout = options.delay;

    // Abort the previous request if it hasn't been sent.
    if (this._xhr && this._xhr.readyState == XMLHttpRequest.OPENED) {
        this._xhr.abort();
    }

    // Replace the old request by the new one.
    this._xhr = xhr;

    // Bind all the XHR events.
    var eventTypes = ['loadstart', 'progress', 'abort', 'error', 'load', 'timeout', 'loadend', 'readystatechange'];

    eventTypes.forEach(function(eventType) {
        xhr.addEventListener(eventType, function() {
            // A last progress event can be triggered once a request has timed out, ignore it.
            if (eventType == 'progress' && !_this._requesting) {
                return;
            }

            _this.trigger('xhr-'+ eventType, arguments, xhr);
        });

        // The XMLHttpRequestUpload interface supports all the above event types except the "readystatechange" one.
        if (eventType != 'readystatechange') {
            xhr.upload.addEventListener(eventType, function() {
                _this.trigger('xhr-upload-'+ eventType, arguments, xhr);
            });
        }
    });

    return this;
};

fn._sendRequest = function(data) {
    if (this._xhr && this._xhr.readyState == XMLHttpRequest.OPENED) {
        this._xhr.send(typeof data != 'undefined' ? data : null);
    } else {
        console.warn('A request must have been created before it can be sent.');
    }

    return this;
};

fn._abort = function() {
    if (this._xhr) {
        this._xhr.abort();
    }

    return this;
};

fn._getTimingEntry = function(callback) {
    // The Resource Timing entries aren't immediately available once the 'load' event is triggered by an
    // XMLHttpRequest, we must wait for another process tick to check for a refreshed list.
    setTimeout((function(lastURLToken) {
        return function() {
            // Filter the timing entries to return only the one concerned by the last request made.
            var entries = performance.getEntriesByType('resource').filter(function(entry) {
                return ~entry.name.indexOf(lastURLToken);
            });

            // Return the entry through the callback.
            typeof callback == 'function' && callback(entries.length ? entries[0] : null);
        };
    })(this._lastURLToken), 0);

    return this;
};

fn._setRequesting = function(value) {
    this._requestingOverridden = true;
    this._requesting = value;
};

},{"../event-dispatcher":2,"../utilities":7}],5:[function(require,module,exports){
'use strict';

var HttpModule = require('./http'),
    Timing = require('../timing'),
    Utilities = require('../utilities');

var LatencyModule = module.exports = function(options) {
    // We dont want any timeout during a latency calculation. Here we are using extend() because we want to edit the
    // delay on a clone of the object and not the original one.
    options = Utilities.extend(options, {
        delay: 0
    });

    // Call parent constructor.
    HttpModule.call(this, 'latency', options);

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
};

var fn = LatencyModule.prototype = Object.create(HttpModule.prototype);

fn.start = function() {
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
};

fn._initLatencyConfig = function() {
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
};

fn._nextRequest = function() {
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
    isThereAnyZeroLatency && console.warn([
        'At least one latency returned a zero value, this can be due to the configuration of your web server which',
        'is probably using persistant connections. Check the documentation to solve this problem.'
    ].join(' '));

    // Trigger the "end" event with the average latency and the latency list as parameters.
    this.trigger('end', [avgLatency, latencies]);
};

},{"../timing":6,"../utilities":7,"./http":4}],6:[function(require,module,exports){
'use strict';

var Timing = module.exports = function() {};

var staticScope = Timing;

staticScope._marks = {};
staticScope._measures = {};

// Does the browser support the following APIs?
staticScope._support = {
    performance: !!window.performance,
    userTiming: window.performance && performance.mark,
    resourceTiming: window.performance && (typeof(performance.getEntriesByType) == "function") && performance.timing
};

staticScope.mark = function(label) {
    var support = this._support,
        marks = this._marks;

    if (support.userTiming) {
        performance.mark(label);
    } else if (support.performance) {
        marks[label] = performance.now();
    } else {
        marks[label] = (new Date).getTime();
    }

    return this;
};

staticScope.measure = function(measureLabel, markLabelA, markLabelB) {
    var support = this._support,
        marks = this._marks,
        measures = this._measures;

    if (typeof measures[measureLabel] == 'undefined') {
        if (support.userTiming) {
            performance.measure(measureLabel, markLabelA, markLabelB);
            measures[measureLabel] = performance.getEntriesByName(measureLabel)[0].duration;
        } else {
            measures[measureLabel] = marks[markLabelB] - marks[markLabelA];
        }
    }

    return measures[measureLabel];
};

staticScope.supportsResourceTiming = function() {
    return this._support.resourceTiming;
};

},{}],7:[function(require,module,exports){
'use strict';

function extend(destination, source) {
    // Deep clone the objects to avoid any module to modify options of another module.
    // See: http://stackoverflow.com/a/5344074/1513045
    destination = JSON.parse(JSON.stringify(destination || {}));
    source = JSON.parse(JSON.stringify(source || {}));

    // Apply source values on the destination object.
    Object.keys(source).forEach(function(key) {
        destination[key] = source[key];
    });

    return destination;
}

exports.extend = extend;

},{}]},{},[1])(1)
});


//# sourceMappingURL=speedtest.js.map