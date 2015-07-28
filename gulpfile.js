var $ = require('gulp-load-plugins')({lazy: true});
var args = require('yargs').argv;
var config = require('./gulp.config')();
var del = require('del');
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

gulp.task('styles', ['clean-styles'], function() {
    log('Compiling Less --> CSS');
    
    return gulp
        .src(config.less)
        // plumber is a nice plug-in to handle errors in our stream. it does something similar to the errorLogger created below. 
        // errorLogger actually terminates the stream, whereas plumber doesn't, but does display error information
        .pipe($.plumber())
        .pipe($.less())
        //.on('error', errorLogger)
        .pipe($.autoprefixer({browsers: ['last 2 version', '> 5%']}))
        .pipe(gulp.dest(config.temp));
});

/* 
 * while below can be used as a precursor to other task, no stream is being returned, 
 * task depending on this won't neccessarily wait until this task completes before running
 * therefor need to update to similar function below that takes a callback function
 * i.e. in clean below would need to ensure the callback function 'done' gets called after
 * del, in this case though, del takes a callback function and will invoke it for us
*/
// gulp.task('clean-styles', function() {
//     var files = config.temp + '**/*.css';
//     clean(files);
// });

gulp.task('clean-styles', function(done) {
    var files = config.temp + '**/*.css';
    clean(files, done);
});

gulp.task('less-watcher', function() {
    gulp.watch([config.less], ['styles']);
});

//////////////////////////////////////////////////////////////////
// function errorLogger(error) {
//     log('*** Start of Error ***');
//     log(error);
//     log('*** End of Error ***');
//     this.emit('end');
// }

function clean(path, done) {
    log('Cleaning: ' + $.util.colors.green(path));
    del(path, done);
}

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
