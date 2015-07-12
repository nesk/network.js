'use strict';

/*
 * Requirements
 */

var path = require('path'),
    spawn = require('child_process').spawn;

var argv = require('yargs').argv,
    babelify = require('babelify'),
    browserify = require('browserify'),
    buffer = require('vinyl-buffer'),
    chalk = require('chalk'),
    exorcist = require('exorcist'),
    gulp = require('gulp'),
    npm = require('npm'),
    source = require('vinyl-source-stream');

var bump = require('gulp-bump'),
    git = require('gulp-git'),
    rename = require('gulp-rename'),
    sourcemaps = require('gulp-sourcemaps'),
    uglify = require('gulp-uglify');

/*
 * Paths
 */

var paths = {
    src: './lib/Network.js',
    dest: 'dist',
    versioning: ['bower.json', 'package.json'],
    release: ['dist/**', 'bower.json', 'package.json'],
    watch: ['lib/**', 'utils/**']
};

var names = {
    base: 'network.js',
    min: 'network.min.js'
};

/*
 * Helpers
 */

function error(error) {
    console.log('\n' + chalk.red('Error: ') + error.message + '\n');
    this.emit('end');
}

/*
 * Standard tasks
 */

gulp.task('default', function() {
    return browserify({
        entries: paths.src,
        standalone: 'Network',
        debug: true
    })
        .transform(babelify.configure({
            optional: ['es7.classProperties', 'es7.decorators']
        }))
        .bundle().on('error', error)
        .pipe(exorcist(path.join(paths.dest, names.base + '.map')))
        .pipe(source(names.base))
        .pipe(gulp.dest(paths.dest))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify().on('error', error))
        .pipe(rename(names.min))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(paths.dest));
});

gulp.task('test', ['default'], function(cb) {
    spawn('mocha-phantomjs', ['test/test.html']).on('close', function(code) {
        cb(code ? "Test failed. Run `npm test` for more details." : undefined);
    });
});

/*
 * Releasing tasks
 */

gulp.task('release', ['default', 'test', 'bump', 'commit', 'tag']);

gulp.task('bump', ['test'], function() {
    return gulp.src(paths.versioning)
        .pipe(bump({version: argv.v}))
        .pipe(gulp.dest('./'));
});

gulp.task('commit', ['bump'], function() {
    return gulp.src(paths.release)
        .pipe(git.add())
        .pipe(git.commit('Bump to v' + argv.v));
});

gulp.task('tag', ['commit'], function(cb) {
    var version = 'v' + argv.v;
    git.tag(version, 'Release ' + version, cb);
});

/*
 * Publishing tasks
 */

gulp.task('publish', ['publish-git', 'publish-npm']);

gulp.task('publish-git', function(cb) {
    git.push('origin', 'master', {
        args: '--tags'
    }, cb);
});

gulp.task('publish-npm', function(cb) {
    npm.load(function() {
        npm.commands.publish(cb);
    });
});

/*
 * Watching tasks
 */

gulp.task('watch', function(cb) {
    var watcher = gulp.watch(paths.watch, ['default']);

    watcher.on('change', function(event) {
        var type = event.type.toUpperCase().slice(0, 1) + event.type.toLowerCase().slice(1);
        console.log('\n' + chalk.yellow(type + ': ') + chalk.magenta(event.path) + '\n');
    });
});
