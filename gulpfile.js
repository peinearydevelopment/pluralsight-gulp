var $ = require('gulp-load-plugins')({lazy: true});
var args = require('yargs').argv;
var browserSync = require('browser-sync');
var config = require('./gulp.config')();
var del = require('del');
var gulp = require('gulp');
var port = process.env.PORT || config.defaultPort;

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
        // plumber is a nice plug-in to handle errors in our stream.
        // it does something similar to the errorLogger created below.
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

gulp.task('wiredep', function() {
    log('Wire up the bower css, js and our app.js into the html');

    var options = config.getWiredepDefaultOptions();
    var wiredep = require('wiredep').stream;

    return gulp
        .src(config.index) // get index.html
        .pipe(wiredep(options)) // call wiredep, looks in bower.json at runtime dependencies('dependencies' --> not dev)
                                // looks in bower_components/<directory>
                                // main property and it's dependencies for each component
                                // and then injects all of them into the index.html
        .pipe($.inject(gulp.src(config.js)))
        .pipe(gulp.dest(config.client));
});

gulp.task('inject', ['wiredep', 'styles'], function() {
    log('Wire up the bower css, js and our app.js into the html');

    return gulp
        .src(config.index) // get index.html
        .pipe($.inject(gulp.src(config.css)))
        .pipe(gulp.dest(config.client));
});

// SPECIFIC TO NODE: detects changes to files on server and can perform actions on events
gulp.task('serve-dev', ['inject'], function() {
    var isDev = true;
    
    var nodeOptions = {
        script: config.nodeServer,
        delayTime: 1, // seconds
        env: {
            'PORT': port,
            'NODE_ENV': isDev ? 'dev' : 'build'
        },
        watch: [config.server]
    };
    
    return $.nodemon(nodeOptions)
        .on('restart', /*['vet'], can list tasks in here to run on events*/ function(event) {
            log('*** nodemon restarted');
            log('files changed on restart:\n' + event);
            setTimeout(function() {
                browserSync.notify('reloading now ...');
                browserSync.reload({stream: false});
            }, config.browserReloadDelay);
        })
        .on('start', function() {
            log('*** nodemon started');
            startBrowserSync();
        })
        .on('crash', function() {
            log('*** nodemon crashed: script crashed for some reason');
        })
        .on('exit', function() {
            log('*** nodemon exited cleanly');
        });
});

//////////////////////////////////////////////////////////////////
function changeEvent(event) {
    var srcPattern = new RegExp('/.*(?=/' + config.source + ')/');
    log('File ' + event.path.replace(srcPattern, '') + ' ' + event.type);
}

function startBrowserSync() {
    if(args.nosync || browserSync.active) {
        return;
    }
    
    log('Starting browser-sync on port ' + port);
    
    gulp.watch([config.less], ['styles'])
        .on('change', function(event) { changeEvent(event); });
    
    var options = {
        proxy: 'localhost:' + port,
        port: 3000,
        files: [
            config.client + '**/*.*',
            '!' + config.less,
            config.temp + '**/*.css'
        ],
        ghostMode: {
            clicks: true,
            location: false,
            forms: true,
            scroll: true
        },
        injectChanges: true,
        logFileChanges: true,
        logLevel: 'debug',
        logPrefix: 'gulp-patterns',
        notify: true,
        reloadDelay: 1000 //ms
    };
    
    browserSync(options);
}

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
