(function ($) {

    $.properties = {};

    $.properties.map = {};

    $.properties.config = function (settings) {
        var defaults = {
            name: 'appconfig',
            path: '',
            namespace:null,
            mode:'map',
            cache: false,
            async: false,
            encoding: 'UTF-8',
            callback: null
        };

        settings = $.extend(defaults, settings);

        // Ensure a trailing slash on the path
        if (!settings.path.match(/\/$/)) settings.path += '/';

        // Ensure an array
        var files = (settings.name && settings.name.constructor === Array) ? settings.name : [settings.name];

        files.forEach(function (file) {
            var defaultFileName = settings.path + file + '.properties';
            loadAndParseFile(defaultFileName, settings);
        });
        // call callback
        if (settings.callback && !settings.async) {
            settings.callback();
        }
    };

    $.properties.prop = function (namespace,key) {
        var str = "";
        if(arguments.length>1){
            str = $.properties.map[arguments[0]][arguments[1]];
        }else{
            str = $.properties.map[arguments[0]];
        }
        return str;
    };

    function callbackIfComplete(settings) {

        if (settings.async) {
            if (settings.filesLoaded === settings.totalFiles) {
                if (settings.callback) {
                    settings.callback();
                }
            }
        }
    }

    /** Load and parse .properties files */
    function loadAndParseFile(filename, settings) {

        if (filename !== null && typeof filename !== 'undefined') {
            $.ajax({
                url: filename,
                async: settings.async,
                cache: settings.cache,
                dataType: 'text',
                success: function (data, status) {
                    parseData(data, settings);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    console.log('Failed to download or parse ' + filename + '. errorThrown: ' + errorThrown);
                }
            });
        }
    }

    /** Parse .properties files */
    function parseData(data, settings) {

        var lines = data.split(/\n/);
        var unicodeRE = /(\\u.{4})/ig;
        for (var i=0,j=lines.length;i<j;i++) {
            var line = lines[i];

            line = line.trim();
            if (line.length > 0 && line.match("^#") != "#") { // skip comments
                var pair = line.split('=');
                if (pair.length > 0) {
                    /** Process key & value */
                    var name = decodeURI(pair[0]).trim();
                    var value = pair.length == 1 ? "" : pair[1];
                    // process multi-line values
                    while (value.search(/\\$/) != -1) {
                        value = value.substring(0, value.length - 1);
                        value += lines[++i].trim();
                    }
                    // Put values with embedded '='s back together
                    for (var s = 2; s < pair.length; s++) {
                        value += '=' + pair[s];
                    }
                    value = value.trim();

                    /** Mode: bundle keys in a map */
                    if (settings.mode == 'map' || settings.mode == 'both') {
                        // handle unicode chars possibly left out
                        var unicodeMatches = value.match(unicodeRE);
                        if (unicodeMatches) {
                            unicodeMatches.forEach(function (match) {
                                value = value.replace(match, unescapeUnicode(match));
                            });
                        }
                        // add to map
                        if (settings.namespace) {
                            $.properties.map[settings.namespace][name] = value;
                        } else {
                            $.properties.map[name] = value;
                        }
                    }

                } // END: if(pair.length > 0)
            } // END: skip comments
        }
    }
    /** Unescape unicode chars ('\u00e3') */
    function unescapeUnicode(str) {

        // unescape unicode codes
        var codes = [];
        var code = parseInt(str.substr(2), 16);
        if (code >= 0 && code < Math.pow(2, 16)) {
            codes.push(code);
        }
        // convert codes to text
        return codes.reduce(function (acc, val) { return acc + String.fromCharCode(val); }, '');
    }
}) (jQuery);