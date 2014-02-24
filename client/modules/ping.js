define(['modules/basic'], function(BasicModule) {

    'use strict';

    var PingModule = function() {
        BasicModule.call(this);
    };

    var fn = PingModule.prototype = Object.create(BasicModule.prototype);

    fn.start = function() {

    };

    // Class exposure.
    return PingModule;

});