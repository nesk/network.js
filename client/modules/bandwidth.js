define(['modules/http', 'timing'], function(HttpModule, Timing) {

    'use strict';

    var BandwidthModule = function(endpoint, loadingType) {
        HttpModule.call(this, endpoint);

        var validLoadingTypes = ['upload', 'download'];
        this._loadingType = (~validLoadingTypes.indexOf(loadingType)) ? loadingType : 'download';

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
        var reqID = this._requestID++;

        this._lastLoadedValue = null;
        this._speedRecords = [];

        // Create unique timing labels for the new request.
        var labels = this._timingLabels;
        labels.start = 'upload-'+ reqID + '-start';
        labels.progress = 'upload-'+ reqID + '-progress';
        labels.end = 'upload-'+ reqID + '-end';
        labels.measure = 'upload-'+ reqID + '-measure';

        // Generate some random data to upload to the server. Here we're using a Blob instead of an ArrayBuffer because
        // of a bug in Chrome (tested in v33.0.1750.146), causing a freeze of the page while trying to directly upload
        // an ArrayBuffer (through an ArrayBufferView). The freeze lasts nearly 4.5s for 10MB of data. Using a Blob
        // seems to solve the problem.
        var blob = new Blob([new ArrayBuffer(1024*1024*20)]);

        // Initiate and send a new request.
        this._newRequest('POST')._sendRequest(blob);
    };

    fn._initBandwidthConfig = function() {
        var _this = this;

        this.on('xhr-upload-loadstart', function() {
            Timing.mark(_this._timingLabels.start);
        });

        this.on('xhr-upload-progress', function(event) {
            _this._progress(event);
        });

        this.on('xhr-upload-loadend', function(event) {
            _this._end(event);
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

    fn._end = function(event) {
        this.trigger('end', [this._avgSpeed, this._speedRecords]);
    };

    // Class exposure.
    return BandwidthModule;

});