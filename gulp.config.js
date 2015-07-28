module.exports = function() {
    var client = './src/client/';
    var temp = './.tmp/';

    var config = {
        alljs: [
            './src/**/*.js',
            './*.js'
        ],
        less: [client + 'styles/styles.less'],
        temp: temp
    };

    return config;
};
