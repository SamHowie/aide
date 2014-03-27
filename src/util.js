"use strict";

var fs          = require("fs");
var path        = require("path");
var Q           = require("q");
var minimatch   = require("minimatch");

var util = module.exports = {};

util.forEachSeries =  function (arr, iterator) {
    return util.series(arr.map(function(el) {
        return function() {
            return iterator(el);
        }
    }));
};

util.series = function (arr) {
    var promise = Q();

    arr.forEach(function(el) {
        promise = promise.then(
            function() {
                return el.apply(el, arguments);
            }
        )
    });

    return promise;
};

util.runSequentialTasks = function (arr) {
    return util.forEachSeries(arr, function (task) {
        return aide.run(task);
    });
};

// walk algorithms from:
// http://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
util.walk = function (dir) {
    var deferred, results;

    deferred = Q.defer();
    results = [];

    fs.readdir(dir, function(err, list) {
        var pending;

        if (err) {
            deferred.reject(err);
        }

        pending = list.length;
        if (!pending) {
            deferred.resolve(results);
        }

        list.forEach(function(file) {
            file = path.resolve(dir, file);
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    util.walk(file).then(function(res){
                        results = results.concat(res);
                        if (!--pending) {
                            deferred.resolve(results);
                        }
                    }, function (err) {
                        deferred.reject(err);
                    });
                } else {
                    results.push(file);
                    if (!--pending) {
                        deferred.resolve(results);
                    }
                }
            });
        });
    });

    return deferred.promise;
};

util.walkSync = function (dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(util.walkSync(file));
        } else {
            results.push(file);
        }
    });
    return results;
};

util.glob = function (patterns, dir) {
    var i;
    dir = dir || process.cwd();
    return util.walk(dir).then(function(files) {
        files = files.map(function(el) {
            return el.replace(dir + "/", "");
        });
        for (i = 0; i < patterns.length; i += 1) {
            files = files.filter(minimatch.filter(patterns[i]));
        }
        return files;
    });
};

util.globSync = function (patterns, dir) {
    var files, i;
    files = util.walkSync(dir).map(function(el) {
        return el.replace(dir + "/", "");
    });
    for (i = 0; i < patterns.length; i += 1) {
        files = files.filter(minimatch.filter(patterns[i]));
    }
    return files;
};