var validateOptions = require('schema-utils');
const https = require("https");
const Cache = require("../../lib/Cache");
const getLazyHashedEtag = require("../../lib/cache/getLazyHashedEtag");
const ABSOLUTE_PATH_MARKER = '[ABSOLUTE_PATH]';

// schema for options object
const schema = {
	type: 'object',
	properties: {
		host: {
			type: 'string'
		},
		user: {
			type: 'string'
		},
		password: {
			type: 'string'
		}
	}
};

class GradleEnterpriseBuildCache extends Cache {
	get(identifier, etag, callback) {
		let newIdentifier = this._normalize(identifier, '/Users/eric/src/webpack');
		if (etag !== null) {
			console.log('get() GradleEnterpriseBuildCache: getting ETag ' + etag.toString() + ' from cache');
			super.get(newIdentifier, etag, (err, sourceFromCache) => {
				if (!sourceFromCache) {
					callback(err, this._readFromBuildCache(etag.toString(), () => {
						console.log('get() Successfully read shared cache entry at ' + etag.toString());
					}));
				}
			});
		} else {
			console.warn('get() ETag not specified for identifier: ' + newIdentifier);
			super.get(newIdentifier, etag, (err, result) => {
				if (err) {
					callback(err, null);
				} else {
					callback(err, this._denormalize(result, '/Users/eric/src/webpack'));
				}
			});
		}
	}

	store(identifier, etag, data, callback) {
		let normalizedData = this._normalize(data, '/Users/eric/src/webpack');
		let newIdentifier = this._normalize(identifier, '/Users/eric/src/webpack');
		if (etag !== null) {
			super.store(newIdentifier, etag, normalizedData, callback);
			console.log('store() GradleEnterpriseBuildCachePlugin: storing ETag ' + etag.toString() + ' in cache');
			this._writeToBuildCache(etag.toString(), this._normalize(data, '/Users/eric/src/webpack'));
		} else {
			super.store(newIdentifier, etag, normalizedData, callback);
			console.log('store() Storing ' + newIdentifier + ' in shared build cache');
			// FIXME: Error: Module.updateHash: There was no ChunkGraph assigned to the Module for backward-compat (Use the new API)
			// let lazyHashedEtag = getLazyHashedEtag(data).toString();
			// this._writeToBuildCache(lazyHashedEtag, data);
		}
	}

	storeBuildDependencies(dependencies, callback) {
		let newDependencies = this._normalize(dependencies, '/Users/eric/src/webpack');
		super.storeBuildDependencies(newDependencies, callback);
	}

	// Relativize all file paths.
	// TODO: Normalize all timestamps
	_normalize(obj, contextPath) {
		if (!obj) {
			return obj;
		} else if (typeof obj === 'string') {
			return obj.replace(contextPath, ABSOLUTE_PATH_MARKER);
		} else if (Array.isArray(obj)) {
			return obj.map(val => this._normalize(val))
		} else if (typeof obj === 'object') {
			// ['path', 'descriptionFilePath', 'context', 'request', 'resource', 'userRequest']
			Object.keys(obj).forEach(prop => {
				if (typeof obj[prop] === 'string') {
					obj[prop] = obj[prop].replace(contextPath, ABSOLUTE_PATH_MARKER);
				} else if (typeof obj[prop] === 'object') {
					obj[prop] = this._normalize(obj[prop], contextPath);
				}
			});
			return obj;
		}
	}

	// Add context and absolute paths
	_denormalize(obj, contextPath) {
		if (!obj) {
			return obj;
		} else if (typeof obj === 'string') {
			console.info('_denormalized: ' + obj.replace(ABSOLUTE_PATH_MARKER, contextPath));
			return obj.replace(ABSOLUTE_PATH_MARKER, contextPath);
		} else if (typeof obj === 'object') {
			['path', 'descriptionFilePath', 'context', 'request', 'resource', 'userRequest'].forEach(prop => {
				if (typeof obj[prop] === 'string') {
					obj[prop] = obj[prop].replace(ABSOLUTE_PATH_MARKER, contextPath);
				}
			});
			console.info('_denormalized: ' + JSON.stringify(obj));
			return obj;
		}
	}

	_readFromBuildCache(filename, callback) {
		const options = {
			hostname: this.host,
			port: 5071,
			path: "/cache/" + filename,
			method: "GET",
			headers: {
				Accept: "application/vnd.gradle.build-cache-artifact.v1"
			},
			authorization: {
				user: this.user,
				password: this.password
			}
		};

		const req = https.request(options, callback);
		req.on("error", console.error);
		req.end();
	}

	_writeToBuildCache(filename, data) {
		const options = {
			hostname: this.host,
			port: 5071,
			path: "/cache/" + filename,
			method: "PUT",
			headers: {
				"Content-Type": "application/vnd.gradle.build-cache-artifact.v1", // Same value as https://github.com/gradle/gradle/blob/a0db7e3adf4320ce75b1251bde55f275d8a1d6b7/subprojects/build-cache-http/src/main/java/org/gradle/caching/http/internal/HttpBuildCacheService.java#L52
				"X-Webpack-Version": "5.0-beta",
				"Content-Length": data.toString().length
			},
			authorization: {
				user: this.user,
				password: this.password
			}
		};

		const req = https.request(options, res => {
			console.log(`PUT statusCode: ${res.statusCode}`);
		});
		req.on("error", console.error);
		req.write(data);
		req.end();
	}
}

class GradleEnterpriseBuildCachePlugin {
	options = {};

	constructor(options = {}) {
		validateOptions(schema, options, 'Gradle Enterprise Build Cache Plugin');
		this.options = options;
	}

	apply(compiler) {
		compiler.cache = new GradleEnterpriseBuildCache();
		compiler.hooks.beforeRun.tap('Gradle Enterprise Build Cache Plugin', (
			compiler
		) => {
			compiler.cache.hooks.get.tap('GradleEnterpriseBuildCache::get', (identifier, etag, gotHandlers) => {
				// console.log('GradleEnterpriseBuildCachePlugin: getting identifier ' + identifier + ' from cache');
			});
			compiler.cache.hooks.store.tap('GradleEnterpriseBuildCache::store', (identifier, etag, data) => {
				// console.log('GradleEnterpriseBuildCachePlugin: storing identifier ' + identifier + ' in cache');
			});
		});
	}
}

module.exports = GradleEnterpriseBuildCachePlugin;
