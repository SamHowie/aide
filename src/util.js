"use strict";

var fs              = require("fs");
var Q               = require("q");
var minimatch       = require("minimatch");

module.exports = {
    forEachSeries: function (arr, iterator) {
        return util.series(arr.map(function(el) {
            return function() {
                return iterator(el);
            }
        }));
    },

    series: function (arr) {
        var promise = Q();

        arr.forEach(function(el) {
            promise = promise.then(
                function() {
                    return el.apply(el, arguments);
                }
            )
        });

        return promise;
    },

    runSequentialTasks: function(arr) {
        return util.forEachSeries(arr, function (task) {
            return aide.run(task);
        });
    },

    walk: function(dir, done) {
        var results = [];
        fs.readdir(dir, function(err, list) {
            if (err) return done(err);
            var pending = list.length;
            if (!pending) return done(null, results);
            list.forEach(function(file) {
                file = dir + "/" + file;
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        util.walk(file, function(err, res) {
                            results = results.concat(res);
                            if (!--pending) done(null, results);
                        });
                    } else {
                        results.push(file);
                        if (!--pending) done(null, results);
                    }
                });
            });
        });
    },

    glob: function(patterns, dir) {
        var deferred, i;

        dir = dir || process.cwd();

        deferred = Q.defer();

        util.walk(dir, function(err, files) {
            if (err != null) {
                aide.say(err.message, "error");
                deferred.reject(err);
            } else {
                files = files.map(function(el) {
                    return el.replace(dir + "/", "");
                });

                for (i = 0; i < patterns.length; i += 1) {
                    files = files.filter(minimatch.filter(patterns[i]));
                }

                deferred.resolve(files);
            }
        });

        return deferred.promise;
    }
};