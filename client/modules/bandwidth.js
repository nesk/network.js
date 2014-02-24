define(['modules/basic'], function(BasicModule) {

    'use strict';

    var BandwidthModule = function(loadingType) {
        BasicModule.call(this);

        var validLoadingTypes = ['upload', 'download'];
        this._loadingType = (~validLoadingTypes.indexOf(loadingType)) ? loadingType : 'download';
    };

    var fn = BandwidthModule.prototype = Object.create(BasicModule.prototype);

    fn.start = function() {

    };

    // Class exposure.
    return BandwidthModule;

});