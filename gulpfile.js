/*
 * Requirements
 */

var browserify = require('browserify'),
    buffer = require('vinyl-buffer'),
    gulp = require('gulp'),
    source = require('vinyl-source-stream');

/*
 * Gulp plugins
 */

var rename = require('gulp-rename'),
    uglify = require('gulp-uglify');

/*
 * Paths
 */

var paths = {
    src: './client/speedtest.js',
    dest: 'dist/'
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
        standalone: 'SpeedTest'
    })
        .bundle()
        .pipe(source(names.base))
        .pipe(gulp.dest(paths.dest))
        .pipe(buffer())
        .pipe(uglify())
        .pipe(rename(names.min))
        .pipe(gulp.dest(paths.dest));
});
