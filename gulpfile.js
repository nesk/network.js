var gulp = require('gulp'),
    rjs = require('gulp-requirejs'),
    uglify = require('gulp-uglify');

gulp.task('optimize', function() {
    return rjs({
        baseUrl: 'client',
        paths: {
            'almond': '../node_modules/almond/almond'
        },
        include: [
            'almond',
            'speedtest'
        ],
        out: 'speedtest.js',
        wrap: true
    })
    .pipe(gulp.dest('dist/'));
});

gulp.task('default', ['optimize']);