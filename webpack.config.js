// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const path = require('path');
const webpack = require('webpack');

module.exports = {
	mode: 'development',
	entry: path.resolve('src/index.tsx'),
	output: {
		path: __dirname,
		filename: 'bundle.js'
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env.REACT_APP_AZURE_CLIENT_ID': JSON.stringify(process.env.REACT_APP_AZURE_CLIENT_ID || '553b922f-3ce9-45f1-84d8-c3d4c25f1cc6'),
			'process.env.REACT_APP_AZURE_AUTHORITY': JSON.stringify(process.env.REACT_APP_AZURE_AUTHORITY || 'https://login.microsoftonline.com/c869cf92-11d8-4fbc-a7cf-6114d160dd71'),
			'process.env.REACT_APP_REDIRECT_URI': JSON.stringify(process.env.REACT_APP_REDIRECT_URI || 'https://localhost:9000'),
		}),
	],
	module: {
		rules: [
			{
				test: /\.ts(x)?$/,
				loader: 'ts-loader'
			},
			{
				test: /\.css$/,
				use: [
					'style-loader',
					'css-loader'
				]
			},
		]
	},
	resolve: {
		extensions: [
			'.tsx',
			'.ts',
			'.js',
		],
		fallback: {
			"process": require.resolve("process/browser")
		}
	},
	devtool: 'source-map',
	devServer: {
		static: {
			directory: path.join(__dirname, 'src'),
		},
		compress: true,
		port: 9000,
		open: true,
		hot: true,
		server: 'https',
		allowedHosts: 'all',
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
			'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
			'Access-Control-Allow-Credentials': 'true'
		},
	},
};