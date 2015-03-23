/*
 * Requirements
 */

var path = require('path');

var browserify = require('browserify'),
    buffer = require('vinyl-buffer'),
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
    dest: 'dist'
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
