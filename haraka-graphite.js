#!/usr/bin/env node
/*jshint -W110 */
/*jshint strict: false */

// this script takes inspiration from:
// https://github.com/visionmedia/express/blob/master/bin/express
// https://github.com/tnantoka/LooseLeaf/blob/master/bin/looseleaf


var fs   = require('fs'),
    path = require('path'),
    nopt = require('nopt'),
    os   = require('os'),
    base = path.join(__dirname),
    graphite = require('graphite-udp'),
    ver  = JSON.parse(fs.readFileSync(base+'/package.json', 'utf8')).version,
    knownOpts = {
        "version":     Boolean,
        "verbose":     Boolean,
        "help":        [String, null],
        "configs":     path,
        "daemon":       Boolean,
        "qlist":       Boolean,
        "qstat":       Boolean,
        "qempty":      Boolean,
        "stats-interval": Number
    },
    shortHands = {
        "v": ["--version"],
        "h": ["--help"],
        "c": ["--configs"],
        "d": ["--daemon"],
        "i": ["--stats-interval"]
    },
    parsed = nopt(knownOpts, shortHands, process.argv, 2),
    existsSync = require('Haraka/utils').existsSync;

var usage = [
    "\033[32;40mharaka-graphite.js\033[0m — Export Email Server stats to Graphite",
    "Usage: haraka-graphite [options] [path]",
    "Options:",
    "\t-v, --version \t\tOutputs version number",
    "\t-h, --help    \t\tOutputs this help message",
    "\t-h NAME       \t\tShows help for NAME",
    "\t-c, --configs \t\tPath to your config directory",
    "\t--daemon       \t\tRun statistics as a daemon to report outbound queue size",
    "\t--qlist       \t\tList the outbound queue",
    "\t--qstat       \t\tGet statistics on the outbound queue",
    "\t--qempty       \t\tShows whether outbound queue is empty",
    "\t-i, --stats-interval N \tReport stats every n milliseconds",
].join('\n');

// Warning messsage
function warning(msg) {
    console.error('\x1b[31mwarning\x1b[0m: ' + msg);
}

function fail(msg) {
    console.error('\x1b[31merror\x1b[0m: ' + msg);
    process.exit(-1);
}

// function queue_stat_setup(){
//     // TODO: D.R.Y. up qlist / qstat cases below
// }

var stats_interval = typeof parsed['stats-interval'] === 'undefined' ? 1000 : parsed['stats-interval']
console.log(stats_interval)

if (parsed.version) {
    console.log("\033[32;40mHaraka.js\033[0m — Version: " + ver);
}
if (parsed.help) {
    if (parsed.help === 'true') {
        console.log(usage);
    }
    else {
        var md_path,
            md_paths = [
                path.join(base, 'docs', parsed.help + '.md'),
                path.join(base, 'docs', 'plugins', parsed.help + '.md'),
                path.join(base, 'docs', 'deprecated', parsed.help + '.md'),
            ];
        if (parsed.configs) {
            md_paths.unshift(path.join(parsed.configs, 'docs', 'plugins', parsed.help + '.md'));
            md_paths.unshift(path.join(parsed.configs, 'docs', parsed.help + '.md'));
        }
        for (var i=0, j=md_paths.length; i<j; i++) {
            var _md_path = md_paths[i];
            if(existsSync(_md_path)) {
                md_path = [_md_path];
                break;
            }
        }
        if (!md_path) {
            warning("No documentation found for: " + parsed.help);
            process.exit();
        }
        var pager = 'less', spawn = require('child_process').spawn;
        if (process.env.PAGER) {
            var pager_split = process.env.PAGER.split(/ +/);
            pager = pager_split.shift(); 
            md_path = pager_split.concat(md_path);
        }

        var less  = spawn( pager, md_path, { stdio: 'inherit' } );
        less.on('exit', function() {
            process.exit(0);
        });
    }
}
else if (parsed.qlist) {
    if (!parsed.configs) {
        fail("qlist option requires config path");
    }
    process.env.HARAKA = parsed.configs;
    var logger = require(path.join(base, "logger"));
    if (!parsed.verbose)
        logger.log = function () {}; // disable logging for this
    var outbound = require(path.join(base, "outbound"));
    outbound.list_queue(function () {
        process.exit();
    });
}
else if (parsed.qstat && parsed.daemon) {
    if (!parsed.configs) {
        fail("qstat option requires config path");
    }
    process.env.HARAKA = parsed.configs;
    var logger = require('Haraka/logger');
    if (!parsed.verbose)
        logger.log = function () {}; // disable logging for this
    var outbound = require('Haraka/outbound');
    console.log(outbound);
    console.log('Starting stats collection every ' + stats_interval / 1000 + ' sec');
    setInterval(function() {
      outbound.stat_queue(function (stats) {
        console.log(stats);
      });
    }, stats_interval);
}
else if (parsed.qstat) {
    if (!parsed.configs) {
        fail("qstat option requires config path");
    }
    process.env.HARAKA = parsed.configs;
    var logger = require('Haraka/logger');
    if (!parsed.verbose)
        logger.log = function () {}; // disable logging for this
    var outbound = require('Haraka/outbound');
    outbound.stat_queue(function (stats) {
        console.log(stats);
        process.exit();
    });
}
else if (parsed.qempty) {
    if (!parsed.configs) {
        fail("qempty option requires config path");
    }
    fail("qempty is unimplemented");
}
else {
    console.log("\033[31;40mError\033[0m: Undefined or erroneous arguments\n");
    console.log(usage);
}
