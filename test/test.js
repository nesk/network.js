describe("Network instances", function() {

    it("should expose the expected public API", function() {
        Network._exposeInternalClasses();

        var speed = new Network,
            api = ['Network', {
                latency: ['LatencyModule', {
                    settings: 'function',
                    start: 'function',
                    isRequesting: 'function',
                    on: 'function',
                    off: 'function',
                    trigger: 'function'
                }],

                upload: ['BandwidthModule', {
                    settings: 'function',
                    start: 'function',
                    abort: 'function',
                    isRequesting: 'function',
                    on: 'function',
                    off: 'function',
                    trigger: 'function'
                }],

                download: ['BandwidthModule', {
                    settings: 'function',
                    start: 'function',
                    abort: 'function',
                    isRequesting: 'function',
                    on: 'function',
                    off: 'function',
                    trigger: 'function'
                }],

                settings: 'function',
                isRequesting: 'function'
            }];

        checkApiIntegrity(speed, api, 'speed');
    });

    it("should properly register new settings and return them", function() {
        var speed = new Network({
            endpoint: '/all/',
            delay: 7000,
            measures: 10,

            data: {
                multiplier: 1.5,
            },

            latency: {
                endpoint: '/latency/',
            },

            upload: {
                endpoint: '/upload/',
                delay: 10000,
            },

            download: {
                endpoint: '/download/',

                data: {
                    multiplier: 1.8,
                },
            },
        });

        expect(speed.settings()).to.deep.equal({
            latency: {
                endpoint: '/latency/',
                measures: 10,
                attempts: 3,

                data: {
                    multiplier: 1.5,
                },
            },

            upload: {
                endpoint: '/upload/',
                delay: 10000,
                measures: 10,

                data: {
                    size: 2 * 1024 * 1024,
                    multiplier: 1.5,
                },
            },

            download: {
                endpoint: '/download/',
                delay: 7000,
                measures: 10,

                data: {
                    size: 10 * 1024 * 1024,
                    multiplier: 1.8,
                },
            },
        });
    });

});

describe("latency module", commonModulesIt('latency'));
describe("upload module", commonModulesIt('upload'));
describe("download module", commonModulesIt('download'));

function commonModulesIt(moduleName) {
    return function() {

        it("should properly register and emit a single event", function() {
            var spy = chai.spy(),
                module = (new Network)[moduleName];

            module.on('event-test', spy)
                  .trigger('event-test');

            expect(spy).to.have.been.called.once;
        });

        it("should properly register and emit multiple events", function() {
            var spy = chai.spy(),
                module = (new Network)[moduleName];

            module.on(['event-test-1', 'event-test-2'], spy);
            module.trigger('event-test-1');
            module.trigger('event-test-2');

            expect(spy).to.have.been.called.twice;
        });

        it("should properly deregister a single event", function() {
            var spy = chai.spy(),
                module = (new Network)[moduleName];

            module.on('event-test', spy)
                  .off('event-test', spy)
                  .trigger('event-test');

            expect(spy).to.not.have.been.called;
        });

        it("should properly deregister multiple events", function() {
            var spy = chai.spy(),
                module = (new Network)[moduleName];

            module.on(['event-test-1', 'event-test-2'], spy)
                  .off(['event-test-1', 'event-test-2']);
            module.trigger('event-test-1');
            module.trigger('event-test-2');

            expect(spy).to.not.have.been.called;
        });

        it("should properly propagate `false` return values of event handlers", function() {
            var module = (new Network)[moduleName];

            var returnVal = module.on('event-test', function(){
                return false;
            }).trigger('event-test');

            expect(returnVal).to.be.false;
        });

    };
}
