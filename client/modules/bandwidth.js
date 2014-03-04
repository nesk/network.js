define(['modules/basic'], function(BasicModule) {

    'use strict';

    var BandwidthModule = function(endpoint, loadingType) {
        BasicModule.call(this, endpoint);

        var validLoadingTypes = ['upload', 'download'];
        this._loadingType = (~validLoadingTypes.indexOf(loadingType)) ? loadingType : 'download';
    };

    var fn = BandwidthModule.prototype = Object.create(BasicModule.prototype);

    fn.start = function() {

    };

    // Class exposure.
    return BandwidthModule;

});