import HttpModule from './http';
import Timing from '../timing';
import {assign, defer} from '../utils';

export default class Bandwidth extends HttpModule {

    constructor(loadingType, options = {})
    {
        // Instanciate the parent
        loadingType = (~['upload', 'download'].indexOf(loadingType)) ? loadingType : 'download';

        options = assign({
            dataSize: {
                upload: 2 * 1024 * 1024, // 2 MB
                download: 10 * 1024 * 1024, // 10 MB
                multiplier: 2
            }
        }, options);

        super.constructor(loadingType, options);

        // Define the object properties
        this._loadingType = loadingType;

        this._intendedEnd = false;
        this._isRestarting = false;

        this._lastLoadedValue = null;
        this._speedRecords = [];
        this._avgSpeed = null;

        this._requestID = 0;
        this._progressID = 0;

        this._started = false;
        this._firstProgress = true;
        this._deferredProgress;

        // Unique labels for each request, exclusively used to make measures.
        this._timingLabels = {
            start: null,
            progress: null,
            end: null,
            measure: null
        };

        // Bind to XHR events
        this.on('xhr-upload-loadstart', () => Timing.mark(this._timingLabels.start));
        this.on('xhr-readystatechange', xhr => {
            if (!this._started && xhr.readyState == XMLHttpRequest.LOADING) {
                Timing.mark(this._timingLabels.start);
                this._started = true;
            }
        });

        var eventsPrefix = (loadingType == 'upload') ? 'xhr-upload' : 'xhr';

        this.on(`${eventsPrefix}-progress`, (xhr, event) => this._progress(event));
        this.on(`${eventsPrefix}-timeout`, () => this._timeout());
        this.on(`${eventsPrefix}-loadend`, () => this._end());
    }

    start()
    {
        var loadingType = this._loadingType,
            dataSize = this._options.dataSize,
            reqID = this._requestID++;

        this._intendedEnd = false;
        this._lastLoadedValue = null;
        this._speedRecords = [];
        this._started = false;
        this._firstProgress = true;
        this._deferredProgress = defer();

        // Trigger the start event
        if (!this._isRestarting) {
            this.trigger('start', (loadingType == 'upload') ? dataSize.upload : dataSize.download);
        }

        // Create unique timing labels for the new request
        var labels = this._timingLabels;
        labels.start = `${loadingType}-${reqID}-start`;
        labels.progress = `${loadingType}-${reqID}-progress`;
        labels.end = `${loadingType}-${reqID}-end`;
        labels.measure = `${loadingType}-${reqID}-measure`;

        // Generate some random data to upload to the server. Here we're using a Blob instead of an ArrayBuffer because
        // of a bug in Chrome (tested in v33.0.1750.146), causing a freeze of the page while trying to directly upload
        // an ArrayBuffer (through an ArrayBufferView). The freeze lasts nearly 4.5s for 10MB of data. Using a Blob
        // seems to solve the problem.
        var blob = (loadingType == 'upload') ? new Blob([new ArrayBuffer(dataSize.upload)]) : null;

        var type = (loadingType == 'download') ? 'GET' : 'POST';

        // Initiate and send a new request
        this._newRequest(type, {
            size: dataSize.download
        })._sendRequest(blob);
    }

    abort()
    {
        this._intendedEnd = true;
        return this._abort();
    }

    _progress(event)
    {
        // Ignore the first progress event, it generally contributes to get incoherent values.
        if (this._firstProgress) return this._firstProgress = false;

        // Execute the previous progress trigger
        this._deferredProgress.run();

        var labels = this._timingLabels,
            progressID = this._progressID++,
            markLabel = `${labels.progress}-${progressID}`,
            loaded = event.loaded;

        Timing.mark(markLabel);

        // Measure the average speed (B/s) since the request started
        var avgMeasure = Timing.measure(
                `${labels.measure}-avg-${progressID}`,
                labels.start,
                markLabel
            ),
            avgSpeed = loaded / avgMeasure * 1000;

        var instantSpeed;

        if (!this._lastLoadedValue) { // We are executing the first progress event of the current request
            instantSpeed = avgSpeed; // The instant speed of the first progress event is equal to the average one
        } else {
            // Measure the instant speed (B/s), which defines the speed between two progress events.
            var instantMeasure = Timing.measure(
                `${labels.measure}-instant-${progressID}`,
                // Set the mark of the previous progress event as the starting point
                `${labels.progress}-${progressID - 1}`,
                markLabel
            );
            instantSpeed = (loaded - this._lastLoadedValue) / instantMeasure * 1000;
        }

        // Save the `loaded` property of the event for the next progress event
        this._lastLoadedValue = loaded;

        // Defer measures saving and event triggering, this allows to cancel the last progress event, which can generate
        // incoherent values.
        this._deferredProgress = defer(() => {
            this._avgSpeed = avgSpeed;
            this._speedRecords.push(instantSpeed);

            this.trigger('progress', avgSpeed, instantSpeed);
        });
    }

    _timeout()
    {
        this._intendedEnd = true;
    }

    _end()
    {
        // A timeout or an abort occured, bypass the further requests and trigger the "end" event.
        if (this._intendedEnd) {
            this._isRestarting = false;
            this.trigger('end', this._avgSpeed, this._speedRecords);
        }

        // The request ended to early, restart it with an increased data size.
        else {
            var loadingType = this._loadingType,
                dataSize = this._options.dataSize;

            dataSize.upload *= dataSize.multiplier;
            dataSize.download *= dataSize.multiplier;

            this.trigger('restart', (loadingType == 'upload') ? dataSize.upload : dataSize.download);

            this._isRestarting = true;
            this.start();
        }
    }


}
