define(['event-dispatcher'], function(EventDispatcher) {

    'use strict';

    var HttpModule = function(endpoint) {
        EventDispatcher.call(this);

        this._endpoint = endpoint;
        this._xhr = null;
        this._lastURLToken = null;
        this._requesting = false;

        this._initHttpConfig();
    };

    var fn = HttpModule.prototype = Object.create(EventDispatcher.prototype);

    fn.isRequesting = function() {
        return this._requesting;
    };

    fn._initHttpConfig = function() {
        var _this = this;

        this.on('xhr-loadstart', function() {
            _this._requesting = true;
        });

        this.on('xhr-loadend', function() {
            _this._requesting = false;
        });
    };

    fn._newRequest = function(httpMethod, path) {
        // Check if a callback binded to the "_newRequest" event returns false, if it's the case, cancel the request
        // creation.
        if (!this.trigger('_newRequest')) {
            console.warn('To ensure accurate measures, you can only make one request at a time.');
            return this;
        }

        var _this = this,
            xhr = new XMLHttpRequest(),
            validHttpMethods = ['GET', 'POST'];

        // Prepare the new request.
        if (!~validHttpMethods.indexOf(httpMethod)) {
            console.warn('The HTTP method must be GET or POST.');
            return this;
        }

        // Generate an URL token to avoid any caching issues. This token will also allow to identify the request in the
        // Resource Timing entries.
        this._lastURLToken = 'speedtest-'+ (new Date).getTime();

        var url = this._endpoint + (typeof path != 'undefined' ? path : '') +'?'+ this._lastURLToken;

        xhr.open(httpMethod, url);

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
        this._xhr.send(typeof data != 'undefined' ? data : null);
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

    // Class exposure.
    return HttpModule;

});