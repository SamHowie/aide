"use strict";

require("colors");

var Orchestrator    = require("orchestrator");
var Q               = require("q");
var util            = require("./util");

var tasks           = {};
var orchestrators   = [];

var tones = {
    default: "cyan",
    warn: "yellow",
    error: "red"
};

var verbs = {
    default: "says",
    warn: "warns"
};

function createOrchestrator () {
    return new Orchestrator();
}

var aide = module.exports = {};

aide.loadTasks= function(fn) {
    fn(this);
};

aide.task = function(name, deps, fn) {
    if (arguments.length > 1) {
        if (typeof deps === "function") {
            fn = deps;
            deps = undefined;
        }
        tasks[name] = {
            name: function() {
                return name;
            },
            deps: function() {
                return deps;
            },
            run: function () {
                return aide.run(name);
            },
            addTo: function(orchestrator) {
                var i, task;
                orchestrator.add(name, deps, fn);
                if (deps != null) {
                    for (i = 0; i < deps.length; i += 1) {
                        task = aide.task(deps[i]);
                        task.addTo(orchestrator); // todo: check for circular refs?
                    }
                }
            }
        }
    }
    return tasks[name];
};

aide.run = function(name) {
    var deferred, task, orchestrator;

    deferred = Q.defer();

    orchestrator = createOrchestrator();
    orchestrators.push(orchestrator);

    task = aide.task(name);

    if (task == null) {
        aide.say("But I don't know how to " + name + "...", "error");
        throw new Error("attempted to run unregistered task: " + name);
    }

    task.addTo(orchestrator);

    orchestrator.on("task_start", function(e) {
        aide.say("Running task " + e.task);
    });

    orchestrator.on("stop", function(e) {
        orchestrators.splice(orchestrators.indexOf(orchestrator), 1);
        deferred.resolve();
    });

    orchestrator.on("err", function(err) {
        orchestrators.splice(orchestrators.indexOf(orchestrator), 1);
        deferred.reject(err);
    });

    orchestrator.start(name);

    return deferred.promise;
};

aide.stop = function() {
    var i;
    for (i = 0; i < orchestrators.length; i += 1) {
        orchestrators[i].stop();
    }
    orchestrators.length = 0;
    return this;
};

aide.say = function(msg, tone) {
    console.log(aide.quote(msg, tone));
};

aide.quote = function(msg, tone) {
    var color, verb;

    color = tones[tone];
    if (color == null) {
        color = tones.default;
    }

    verb = verbs[tone];
    if (verb == null) {
        verb = verbs.default;
    }

    return ("Aide " + verb + ", \"" + msg + "\"")[color];
};

aide.cli = function() {
    var path            = require("path");
    var parseArgs       = require("minimist");
    var argv            = parseArgs(process.argv.slice(2));

    var basedir, aidefilepath;

    basedir = process.cwd();
    aidefilepath = path.resolve(basedir, "aidefile");

    require(aidefilepath);
    aide.run(argv._[0]).fail(onError);

    function onError (err) {
        aide.say(err.message, "error");
    }
};

aide.util = util;

