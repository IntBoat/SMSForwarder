/*jshint esversion: 6 */
export default {
    entry: {
        WithCode: './WithCode.js',
        Notify: './Notify.js'
    },
    mode: 'production',
    target: 'web',
    output: {
        filename: '[name].bundle.js'
    },
};