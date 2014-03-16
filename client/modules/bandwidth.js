define(['modules/http'], function(HttpModule) {

    'use strict';

    var BandwidthModule = function(endpoint, loadingType) {
        HttpModule.call(this, endpoint);

        var validLoadingTypes = ['upload', 'download'];
        this._loadingType = (~validLoadingTypes.indexOf(loadingType)) ? loadingType : 'download';
    };

    var fn = BandwidthModule.prototype = Object.create(HttpModule.prototype);

    fn.start = function() {

    };

    // Class exposure.
    return BandwidthModule;

});