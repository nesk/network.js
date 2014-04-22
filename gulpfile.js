var fs = require('fs'),
    gulp = require('gulp'),
    clean = require('gulp-clean'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    requirejs = require('requirejs'),
    Q = require('q');

// Prepares the files used by the RequireJS optimizer.
gulp.task('rjs-prepare', function() {
    return gulp.src('node_modules/almond/almond.js')
        .pipe(uglify())
        .pipe(gulp.dest('dist/.tmp/'));
});

// Executes the RequireJS optimizer. Uses the original project and not a Gulp plugin since no one of them seems to
// support to be run from a watching event.
gulp.task('rjs-process', ['rjs-prepare'], function() {
    var deferred = Q.defer();

    requirejs.optimize({
        baseUrl: 'client',

        paths: {
            'almond': '../dist/.tmp/almond'
        },

        include: [
            'almond',
            'speedtest'
        ],

        optimize: 'none',
        useStrict: true,
        wrap: true,

        out: function(content) {
            fs.writeFile('dist/speedtest.js', content, deferred.resolve);
        }
    });

    return deferred.promise;
});

// Creates a minified version of SpeedTest.
gulp.task('minify', ['rjs-process'], function() {
    return gulp.src('dist/speedtest.js')
        .pipe(uglify())
        .pipe(rename('speedtest.min.js'))
        .pipe(gulp.dest('dist/'));
});

// Cleans the temporary files.
gulp.task('clean', ['rjs-process'], function() {
    gulp.src('dist/.tmp', {read: false})
        .pipe(clean());
});

// Watches for any file changes and runs the default task if needed.
gulp.task('watch', function() {
    var watcher = gulp.watch('client/**/*', ['default']);
    watcher.on('change', function(event) {
        console.log('File '+ event.path +' was '+ event.type +', running tasks...');
    });
});

gulp.task('default', ['rjs-prepare', 'rjs-process', 'minify', 'clean']);