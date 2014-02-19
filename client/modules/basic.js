(function() {

    'use strict';

    /**
     * Creates a new basic SpeedTest module, providing an event dispatcher and basic networking management.
     * @constructor
     */
    var BasicModule = function() {
        this._events = {};
        this._xhr = null;
    };

    var fn = BasicModule.prototype;

    fn.on = function(eventType, callback) {
        var events = this._events[eventType];

        if (events && !~events.indexOf(callback)) {
            events.push(callback);
        }
    };

    fn.off = function(eventType, callback) {
        var events = this._events[eventType],
            eventIndex = events ? events.indexOf(callback) : -1;

        if (!~eventIndex) {
            events.splice(eventIndex, 1);
        }
    };

    fn.trigger = function(eventType, extraParameters) {
        var events = this._events[eventType] || [];

        extraParameters = extraParameters || [];

        events.forEach(function(callback) {
            callback.apply(this, extraParameters);
        });
    };

    fn._newRequest = function(endpoint, httpMethod) {
        var xhr = this._xhr = new XMLHttpRequest(),
            validHttpMethods = ['GET', 'POST'];

        httpMethod = (~validLoadingTypes.indexOf(loadingType)) ? loadingType : 'download';
        xhr.open(httpMethod, endpoint);
    };

    // Class exposure.
    window.BasicModule = BasicModule;

})();