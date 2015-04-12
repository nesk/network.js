describe("SpeedTest instances", function() {

    it("should expose the expected public API", function() {
        SpeedTest._exposeInternalClasses();

        var speed = new SpeedTest,
            api = ['SpeedTest', {
                latency: ['LatencyModule', {
                    start: 'function',
                    isRequesting: 'function',
                    on: 'function',
                    off: 'function',
                    trigger: 'function'
                }],

                upload: ['BandwidthModule', {
                    start: 'function',
                    abort: 'function',
                    isRequesting: 'function',
                    on: 'function',
                    off: 'function',
                    trigger: 'function'
                }],

                download: ['BandwidthModule', {
                    start: 'function',
                    abort: 'function',
                    isRequesting: 'function',
                    on: 'function',
                    off: 'function',
                    trigger: 'function'
                }],

                isRequesting: 'function'
            }];

        checkApiIntegrity(speed, api, 'speed');
    });

});

describe("latency module", commonModulesIt('latency'));
describe("upload module", commonModulesIt('upload'));
describe("download module", commonModulesIt('download'));

function commonModulesIt(moduleName) {
    return function() {

        it("should properly register and emit a single event", function() {
            var spy = chai.spy(),
                module = (new SpeedTest)[moduleName];

            module.on('event-test', spy)
                  .trigger('event-test');

            expect(spy).to.have.been.called.once;
        });

        it("should properly register and emit multiple events", function() {
            var spy = chai.spy(),
                module = (new SpeedTest)[moduleName];

            module.on(['event-test-1', 'event-test-2'], spy);
            module.trigger('event-test-1');
            module.trigger('event-test-2');

            expect(spy).to.have.been.called.twice;
        });

        it("should properly deregister a single event", function() {
            var spy = chai.spy(),
                module = (new SpeedTest)[moduleName];

            module.on('event-test', spy)
                  .off('event-test', spy)
                  .trigger('event-test');

            expect(spy).to.not.have.been.called;
        });

        it("should properly deregister multiple events", function() {
            var spy = chai.spy(),
                module = (new SpeedTest)[moduleName];

            module.on(['event-test-1', 'event-test-2'], spy)
                  .off(['event-test-1', 'event-test-2']);
            module.trigger('event-test-1');
            module.trigger('event-test-2');

            expect(spy).to.not.have.been.called;
        });

    };
}
