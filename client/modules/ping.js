(function() {

    'use strict';

    var PingModule = function() {
        BasicModule.call(this);
    };

    var fn = PingModule.prototype = Object.create(BasicModule.prototype);

    fn.start = function() {

    };

    // Class exposure.
    window.PingModule = PingModule;

})();