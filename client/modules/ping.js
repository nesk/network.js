define(['modules/basic'], function(BasicModule) {

    'use strict';

    var PingModule = function(endpoint) {
        BasicModule.call(this, endpoint);
    };

    var fn = PingModule.prototype = Object.create(BasicModule.prototype);

    fn.start = function() {

    };

    // Class exposure.
    return PingModule;

});