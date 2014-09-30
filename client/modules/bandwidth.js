define(['modules/http', 'timing'], function(HttpModule, Timing) {

    'use strict';

    var BandwidthModule = function(loadingType, options) {
        var validLoadingTypes = ['upload', 'download'];
        var loadingType = (~validLoadingTypes.indexOf(loadingType)) ? loadingType : 'download';

        HttpModule.call(this, loadingType, options);

        this._loadingType = loadingType;

        this._dataAmount = 10 * 1024 * 1024; // Defaults to 10MB
        this._timeoutOccured = false;

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

        this._initBandwidthConfig();
    };

    var fn = BandwidthModule.prototype = Object.create(HttpModule.prototype);

    fn.start = function() {
        var loadingType = this._loadingType,
            reqID = this._requestID++;

        this._timeoutOccured = false;
        this._lastLoadedValue = null;
        this._speedRecords = [];

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
        var blob = (loadingType == 'upload') ? new Blob([new ArrayBuffer(this._dataAmount)]) : null;

        // Initiate and send a new request.
        this._newRequest('POST', {
            size: this._dataAmount
        })._sendRequest(blob);
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
        this._timeoutOccured = true;
    };

    fn._end = function() {
        // A timeout occured, we have enough data, abort the request and trigger the "end" event.
        if (this._timeoutOccured) {
            this.trigger('end', [this._avgSpeed, this._speedRecords]);
        }

        // The request ended to early, restart it with an increased data volume.
        else {
            this._dataAmount *= 2;
            this.trigger('restart', [this._dataAmount]);
            this.start();
        }
    };

    // Class exposure.
    return BandwidthModule;

});