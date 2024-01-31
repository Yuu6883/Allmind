const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

/** @type {AppOptions} */
const config = require('./config.json');
const PAL_ENDPOINT = config.pal
    ? `${config.pal.domain}:${config.pal.whitelist_port}`
    : '';

console.log(`PAL_ENDPOINT=${PAL_ENDPOINT}`);

module.exports = (_, argv) => ({
    entry: './src/web/index.tsx',
    output: {
        filename: '[name].[contenthash].js',
        path: path.resolve(__dirname, 'public'),
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'swc-loader',
                    options: {
                        jsc: {
                            parser: {
                                syntax: 'typescript',
                                tsx: true,
                                decorators: true,
                            },
                            transform: {
                                react: {
                                    pragma: 'React.createElement',
                                    pragmaFrag: 'React.Fragment',
                                    throwIfNamespace: true,
                                    development: false,
                                    useBuiltins: false,
                                    runtime: 'automatic',
                                },
                                optimizer: {
                                    globals: {
                                        vars: {
                                            PAL_ENDPOINT: `"${PAL_ENDPOINT}"`,
                                        },
                                    },
                                },
                            },
                            target: 'es2020',
                            minify:
                                argv.mode === 'production'
                                    ? { compress: true, mangle: true }
                                    : undefined,
                        },
                    },
                },
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.svg$/,
                use: [
                    {
                        loader: '@svgr/webpack',
                    },
                ],
            },
            {
                test: /\.(ico|png|jpg|gif|webp|mp4|wasm)$/i,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 4096,
                        },
                    },
                ],
            },
            {
                test: /\.xml$/,
                type: 'asset/source',
            },
            {
                test: /\.vert|frag$/,
                type: 'asset/source',
                use: 'glslify-loader',
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, 'src', 'web', 'index.html'),
            favicon: path.resolve(__dirname, 'src', 'web', 'allmind.ico'),
            filename: 'index.html',
        }),
    ],
});
