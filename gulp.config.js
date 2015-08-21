module.exports = function() {
    var client = './src/client/';
    var clientApp = client + 'app/';
    var report = './report/';
    var root = './';
    var server = './src/server/';
    var specRunnerFile = 'specs.html';
    var temp = './.tmp/';
    var wiredep = require('wiredep');
    var bowerFiles = wiredep({devDependencies: true})['js'];

    var config = {
        /*File paths*/
        alljs: [
            './src/**/*.js',
            './*.js'
        ],
        build: './build/', // needs to correspond to express.static folder setup in src/server/app.js
        client: client,
        css: [temp + 'styles.css'],
        fonts: './bower_components/font-awesome/fonts/**/*.*',
        html: clientApp + '**/*.html',
        htmltemplates: clientApp + '**/*.html',
        images: client + 'images/**/*.*',
        index: client + 'index.html',
        js: [
            clientApp + '**/*.module.js',
            clientApp + '**/*.js',
            '!' + clientApp + '**/*.spec.js'
        ],
        less: [client + 'styles/styles.less'],
        report: report,
        root: root,
        server: server,
        temp: temp,

        /*Optimized file paths */
        optimized: {
            app: 'app.js',
            lib: 'lib.js'
        },

        /*ANGULAR SPECIFIC*/
        /*Template cache*/
        templateCache: {
            file: 'templates.js',
            options: {
                module: 'app.core',
                standAlone: false,
                root: 'app/'
            }
        },

        /*Browser sync settings*/
        browserReloadDelay: 1000, //ms

        /*Bower locations*/
        bower: {
            json: require('./bower.json'),
            directory: './bower_components/',
            ignorePath: '../..'
        },
        packages : [
            './package.json',
            './bower.json'
        ],

        /*our HTML spec runner*/
        specRunner: client + specRunnerFile,
        specRunnerFile: specRunnerFile,
        specs: [clientApp + '**/*.spec.js'],
        testlibraries: [
            'node_modules/mocha/mocha.js',
            'node_modules/chai/chai.js',
            'node_modules/mocha-clean/index.js',
            'node_modules/sinon-chai/sinon-chai.js',
        ],

        /*Karma and testing settings*/
        specHelpers: [client + 'test-helpers/*.js'],
        serverIntegrationSpecs: [client + 'tests/server-integration/**/*.spec.js'],

        /*Node settings*/
        defaultPort: 7203,
        nodeServer: './src/server/app.js'
    };

    config.getWiredepDefaultOptions = function() {
        var options = {
            bowerJson: config.bower.json,
            directory: config.bower.directory,
            ignorePath: config.bower.ignorePath
        };

        return options;
    };

    config.karma = getKarmaOptions();

    return config;

    //////////////////////////////////////////////////////////////////
    function getKarmaOptions() {
        var options = {
            files: [].concat(
                bowerFiles,
                config.specHelpers,
                client + '**/*.module.js',
                client + '**/*.js',
                temp + config.templateCache.file,
                config.serverIntegrationSpecs
            ),
            exclue: [],
            coverage: {
                dir: report + 'coverage',
                reporters: [
                    {type: 'html', subdir: 'report-html'},
                    {type: 'lcov', subdir: 'report-lcov'}, // can be used by some systems such as Jenkins
                    {type: 'text-summary'}
                ]
            },
            preprocessors: {}
        };

        options.preprocessors[clientApp + '**/!(*.spec)+(.js)'] = ['coverage'];
        return options;
    }
};
