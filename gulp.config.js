module.exports = function() {
    var client = './src/client/';
    var clientApp = client + 'app/';
    var temp = './.tmp/';

    var config = {
        /*File paths*/
        alljs: [
            './src/**/*.js',
            './*.js'
        ],
        client: client,
        css: [temp + 'styles.css'],
        index: client + 'index.html',
        js: [
            clientApp + '**/*.module.js',
            clientApp + '**/*.js',
            '!' + clientApp + '**/*.spec.js'
        ],
        less: [client + 'styles/styles.less'],
        temp: temp,

        /*Bower locations*/
        bower: {
            json: require('./bower.json'),
            directory: './bower_components/',
            ignorePath: '../..'
        }
    };

    config.getWiredepDefaultOptions = function() {
        var options = {
            bowerJson: config.bower.json,
            directory: config.bower.directory,
            ignorePath: config.bower.ignorePath
        };

        return options;
    };

    return config;
};
