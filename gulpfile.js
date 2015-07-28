var $ = require('gulp-load-plugins')({lazy: true});
var args = require('yargs').argv;
var config = require('./gulp.config')();
var gulp = require('gulp');

gulp.task('vet', function() {
    log('Analyzing source with JSHint and JSCS.');

    return gulp
        .src(config.alljs)
        .pipe($.if(args.verbose, $.print()))
        .pipe($.jscs())
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish', {verbose: true}))
        .pipe($.jshint.reporter('fail'));
});

//////////////////////////////////////////////////////////////////
function log(message) {
    if (typeof(message) === 'object') {
        for (var item in message) {
            if (message.hasOwnProperty(item)) {
                $.util.log($.util.colors.green(message[item]));
            }
        }
    } else {
        $.util.log($.util.colors.green(message));
    }
}
