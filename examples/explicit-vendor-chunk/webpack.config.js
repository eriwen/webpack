var path = require("path");
var webpack = require("../../");
var GradleEnterpriseBuildCachePlugin = require("./GradleEnterpriseBuildCachePlugin");

module.exports = [
	{
		name: "vendor",
		mode: "development",
		entry: ["./vendor", "./vendor2"],
		output: {
			path: path.resolve(__dirname, "dist"),
			filename: "vendor.js",
			library: "vendor_[fullhash]"
		},
		infrastructureLogging: {
			debug: /webpack\.cache/
		},
		cache: {
			type: "filesystem",
			cacheDirectory: "/tmp/persistent-cache",
			buildDependencies: {
				config: [__filename] // you may omit this when your CLI automatically adds it
			}
		},
		plugins: [
			new GradleEnterpriseBuildCachePlugin({
				host: "localhost",
				user: "eric",
				password: "bogus"
			}),
			new webpack.DllPlugin({
				name: "vendor_[fullhash]",
				path: path.resolve(__dirname, "dist/manifest.json")
			})
		]
	},

	{
		name: "app",
		mode: "development",
		dependencies: ["vendor"],
		entry: {
			pageA: "./pageA",
			pageB: "./pageB",
			pageC: "./pageC"
		},
		output: {
			path: path.join(__dirname, "dist"),
			filename: "[name].js"
		},
		infrastructureLogging: {
			debug: /webpack\.cache/
		},
		cache: {
			type: "filesystem",
			cacheDirectory: "/tmp/persistent-cache",
			buildDependencies: {
				config: [__filename] // you may omit this when your CLI automatically adds it
			}
		},
		plugins: [
			new GradleEnterpriseBuildCachePlugin({
				host: "localhost",
				user: "eric",
				password: "bogus"
			}),
			new webpack.DllReferencePlugin({
				manifest: path.resolve(__dirname, "dist/manifest.json")
			})
		]
	}
];
