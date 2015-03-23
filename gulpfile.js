/*
 * Requirements
 */

var path = require('path');

var browserify = require('browserify'),
    buffer = require('vinyl-buffer'),
    chalk = require('chalk'),
    exorcist = require('exorcist'),
    gulp = require('gulp'),
    source = require('vinyl-source-stream');

var rename = require('gulp-rename'),
    sourcemaps = require('gulp-sourcemaps'),
    uglify = require('gulp-uglify');

/*
 * Paths
 */

var paths = {
    src: './client/speedtest.js',
    dest: 'dist',
    watch: 'client/**'
};

var names = {
    base: 'speedtest.js',
    min: 'speedtest.min.js'
};

/*
 * Tasks
 */

gulp.task('default', function() {
    return browserify({
        entries: paths.src,
        standalone: 'SpeedTest',
        debug: true
    })
        .bundle()
        .pipe(exorcist(path.join(paths.dest, names.base + '.map')))
        .pipe(source(names.base))
        .pipe(gulp.dest(paths.dest))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify())
        .pipe(rename(names.min))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(paths.dest));
});

gulp.task('watch', function(cb) {
    var watcher = gulp.watch(paths.watch, ['default']);

    watcher.on('change', function(event) {
        var type = event.type.toUpperCase().slice(0, 1) + event.type.toLowerCase().slice(1);
        console.log('\n' + chalk.yellow(type + ': ') + chalk.magenta(event.path) + '\n');
    });
});
