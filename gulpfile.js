var _ = require('lodash');
var $ = require('gulp-load-plugins')({lazy: true});
var args = require('yargs').argv;
var browserSync = require('browser-sync');
var config = require('./gulp.config')();
var del = require('del');
var gulp = require('gulp');
var path = require('path');
var port = process.env.PORT || config.defaultPort;

gulp.task('help', $.taskListing);

gulp.task('default', ['help']);

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

gulp.task('fonts', ['clean-fonts'], function() {
    log('Copying fonts');

    return gulp.src(config.fonts)
        .pipe(gulp.dest(config.build + 'fonts'));
});

gulp.task('images', ['clean-images'], function() {
    log('Copying and compressing the images');

    return gulp.src(config.images)
        .pipe($.imagemin({optimizationLevel: 4}))
        .pipe(gulp.dest(config.build + 'images'));
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

gulp.task('clean', function(done) {
    var delconfig = [].concate(config.build, config.temp);
    log('Cleaning: ' + $.util.colors.green(delconfig));
    del(delconfig, done);
});

gulp.task('clean-fonts', function(done) {
    clean(config.build + 'fonts/**/*.*', done);
});

gulp.task('clean-images', function(done) {
    clean(config.build + 'images/**/*.*', done);
});

gulp.task('clean-styles', function(done) {
    clean(config.temp + '**/*.css', done);
});

gulp.task('clean-code', function(done) {
    var files = [].concat(
        config.temp + '**/*.js',
        config.build + '**/*.html',
        config.build + 'js/**/*.js'
    );

    clean(files, done);
});

gulp.task('less-watcher', function() {
    gulp.watch([config.less], ['styles']);
});

//SPECIFIC TO ANGULAR
gulp.task('templatecache', ['clean-code'], function() {
    log('Creating AngularJS $templateCache');

    return gulp.src(config.htmltemplates)
        .pipe($.minifyHtml({empty: true}))
        .pipe($.angularTemplatecache(
            config.templateCache.file,
            config.templateCache.options
        ))
        .pipe(gulp.dest(config.temp));
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

gulp.task('inject', ['wiredep', 'styles', 'templatecache'], function() {
    log('Wire up the bower css, js and our app.js into the html');

    return gulp
        .src(config.index) // get index.html
        .pipe($.inject(gulp.src(config.css)))
        .pipe(gulp.dest(config.client));
});

gulp.task('build', ['optimize', 'images', 'fonts'], function() {
    log('Building everything');

    var msg = {
        title: 'gulp build',
        subtitle: 'Deployed to the build folder.',
        message: 'Running `gulp serve-build`.'
    };

    del(config.temp);
    log(msg);
    notify(msg);
});

gulp.task('optimize', ['inject', 'test'], function() {
    log('Optimizing the javascript, css, html');

    var assets = $.useref.assets({searchPath: './'});
    var templateCache = config.temp + config.templateCache.file;
    var cssFilter = $.filter('**/*.css', {restore: true});
    var jsLibFilter = $.filter('**/' + config.optimized.lib, {restore: true});
    var jsAppFilter = $.filter('**/' + config.optimized.app, {restore: true});

    return gulp.src(config.index)
        .pipe($.plumber())
        .pipe($.inject(
            gulp.src(templateCache, {read: false}), {
            starttag: '<!-- inject:templates:js -->'
        }))
        .pipe(assets)
        .pipe(cssFilter) // filter to css
        .pipe($.csso()) // csso
        .pipe(cssFilter.restore) // remove css filter

        .pipe(jsLibFilter) // filter to lib js
        .pipe($.uglify()) // uglify
        .pipe(jsLibFilter.restore) // remove js filter

        //ANGULAR specific
        .pipe(jsAppFilter) // filter to app js (custom angular js files)
        .pipe($.ngAnnotate())
        .pipe($.uglify()) // uglify
        .pipe(jsAppFilter.restore) // remove js filter

        .pipe($.rev()) // adds hash to js/css file names if contents have changed
        .pipe(assets.restore())
        .pipe($.useref())
        .pipe($.revReplace()) // replaces references to js/css file names in files with hash appended names
        .pipe(gulp.dest(config.build))
        .pipe($.rev.manifest())
        .pipe(gulp.dest(config.build));
});

/*
 * Bump the version
 * --type=pre will bump the prerelease version *.*.*-x
 * --type=patch or no flag will bump the patch version *.*.x
 * --type=minor will bump the minor version *.x.*
 * --type=major will bump the major version x.*.*
 * --version=1.2.3 will bump to a specific version and ignore other flags
 */
gulp.task('bump', function() {
    var msg = 'Bumping versions';
    var type = args.type;
    var version = args.version;
    var options = {};

    if (version) {
        options.version = version;
        msg += ' to ' + version;
    } else {
        options.type = type;
        msg += ' for a ' + type;
    }

    log(msg);

    return gulp.src(config.packages)
        .pipe($.print())
        .pipe($.bump(options))
        .pipe(gulp.dest(config.root));
});

// SPECIFIC TO NODE: detects changes to files on server and can perform actions on events
gulp.task('serve-build', ['build'], function() {
    serve(false /* isDev */);
});

gulp.task('serve-dev', ['inject'], function() {
    serve(true /* isDev */);
});

gulp.task('test', ['vet', 'templatecache'], function(done) {
    startTests(true /* singleRun */, done);
});

gulp.task('autotest', ['vet', 'templatecache'], function(done) {
    startTests(false /* singleRun */, done);
});

//////////////////////////////////////////////////////////////////
function notify(options) {
    var notifier = require('node-notifier');
    var notifyOptions = {
        sound: 'Bottle',
        contentImage: path.join(__dirname, 'gulp.png'),
        icon: path.join(__dirname, 'gulp.png')
    };

    _.assign(notifyOptions, options);
    notifier.notify(notifyOptions);
}

function startTests(singleRun, done) {
    var karma = require('karma').server;
    var excludeFiles = [];
    var serverSpecs = config.serverIntegrationSpecs;
    excludeFiles = serverSpecs;
    var options = {
        configFile: __dirname + '/karma.conf.js',
        exclude: excludeFiles,
        singleRun: !!singleRun // !! is a js trick to force singleRun value to a boolean
    };

    karma.start(options, karmaCompleted);

    function karmaCompleted(karmaResult) {
        log('Karma completed!');
        if (karmaResult === 1) {
            done('karma: tests failed with code ' + karmaResult);
        } else {
            done();
        }
    }
}

function serve(isDev) {
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
            startBrowserSync(isDev);
        })
        .on('crash', function() {
            log('*** nodemon crashed: script crashed for some reason');
        })
        .on('exit', function() {
            log('*** nodemon exited cleanly');
        });
}

function changeEvent(event) {
    var srcPattern = new RegExp('/.*(?=/' + config.source + ')/');
    log('File ' + event.path.replace(srcPattern, '') + ' ' + event.type);
}

function startBrowserSync(isDev) {
    if (args.nosync || browserSync.active) {
        return;
    }

    log('Starting browser-sync on port ' + port);

    if (isDev) {
        gulp.watch([config.less], ['styles'])
            .on('change', function(event) { changeEvent(event); });
    } else {
        gulp.watch([config.less, config.js, config.html], ['optimize', browserSync.reload])
            .on('change', function(event) { changeEvent(event); });
    }

    var options = {
        proxy: 'localhost:' + port,
        port: 3000,
        files: isDev ? [
            config.client + '**/*.*',
            '!' + config.less,
            config.temp + '**/*.css'
        ] : [],
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
