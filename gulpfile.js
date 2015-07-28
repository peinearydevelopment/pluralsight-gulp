var gulp = require('gulp');

var args = require('yargs').argv;
var gulpif = require('gulp-if');
var gulpprint = require('gulp-print');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var util = require('gulp-util');

gulp.task('vet', function() {
    log('Analyzing source with JSHint and JSCS.');

    return gulp
        .src([
            './src/**/*.js',
            './*.js'
        ])
        .pipe(gulpif(args.verbose, gulpprint()))
        .pipe(jscs())
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish', {verbose: true}))
        .pipe(jshint.reporter('fail'));
});

//////////////////////////////////////////////////////////////////
function log(message) {
    if (typeof(message) === 'object') {
        for (var item in message) {
            if (message.hasOwnProperty(item)) {
                util.log(util.colors.green(message[item]));
            }
        }
    } else {
        util.log(util.colors.green(message));
    }
}
