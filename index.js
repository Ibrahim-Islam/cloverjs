"use strict";
require("reflect-metadata");
var https = require('https');
var ApiRouter = (function () {
    function ApiRouter(app) {
        this.app = app;
    }
    ;
    ApiRouter.prototype.add = function (obj) {
        var _this = this;
        var prot = Object.getPrototypeOf(obj);
        var routes = prot.routes;
        var basePath = prot.routesPath;
        if (!basePath)
            basePath = "";
        console.log('routs addded', basePath);
        if (!routes)
            throw 'No routes found!';
        if (!this.app.api)
            this.app.api = [];
        routes.forEach(function (route) {
            route.path = basePath + route.path;
            _this[route.method](route.path, obj[route.handler], route.auth, obj, route.params[route.handler]);
            _this.app.api.push(route);
        });
        if (prot.rawRoutes) {
            prot.rawRoutes.forEach(function (route) {
                route.path = basePath + route.path;
                _this.app[route.method](route.path, obj[route.handler].bind(obj));
                _this.app.api.push(route);
            });
        }
    };
    ApiRouter.prototype.get = function (path, handler, requireUser, bind, params) {
        if (requireUser === void 0) { requireUser = true; }
        this.app.get(path, this.respond(handler.bind(bind), requireUser, params));
    };
    ApiRouter.prototype.post = function (path, handler, requireUser, bind, params) {
        if (requireUser === void 0) { requireUser = true; }
        this.app.post(path, this.respond(handler.bind(bind), requireUser, params));
    };
    ApiRouter.prototype.respond = function (handler, requireUser, params) {
        var _this = this;
        return function (req, res) {
            if (requireUser && !req.user) {
                res.json({ error: 'Unauthorized' });
                return;
            }
            console.log('before mergee');
            var data = _this.merge(req.body, req.query);
            data = _this.merge(data, req.params);
            console.log('after merge');
            if (params) {
                var args = [];
                for (var _i = 0, params_1 = params; _i < params_1.length; _i++) {
                    var param = params_1[_i];
                    if (param == "$params") {
                        args.push(data);
                    }
                    else if (param == "$user") {
                        args.push(req.user);
                    }
                    else if (param == "$request") {
                        args.push(req);
                    }
                    else if (param && param.type == "$params") {
                        if (data[param.name] == undefined) {
                            res.json({ error: 'Missing Parameter: ' + param.name });
                            return;
                        }
                        console.log(data, param.name);
                        args.push(data[param.name]);
                    }
                    else if (param && param.type == "$user") {
                        args.push(req.user[param.name]);
                    }
                    else if (param && param.type == "$request") {
                        args.push(req[param.name]);
                    }
                }
                console.log('handler', params);
                handler.apply(null, args)
                    .then(function (data) { return res.json({ error: null, data: data }); })
                    .catch(function (error) { return res.json({ error: JSON.stringify(error), data: null }); });
            }
            else {
                handler(data, req.user, req)
                    .then(function (data) { return res.json({ error: null, data: data }); })
                    .catch(function (error) { return res.json({ error: JSON.stringify(error), data: null }); });
            }
        };
    };
    ApiRouter.prototype.merge = function (obj1, obj2) {
        if (!obj2)
            return obj1;
        if (!obj1)
            return obj2;
        for (var attrname in obj2) {
            obj1[attrname] = obj2[attrname];
        }
        return obj1;
    };
    return ApiRouter;
}());
exports.ApiRouter = ApiRouter;
function GET(path, auth) {
    if (auth === void 0) { auth = true; }
    return function (target, key, prop) {
        var types = Reflect['getMetadata']("design:paramtypes", target, key);
        if (!target.$paramsTypes)
            target.$paramsTypes = {};
        if (!target.$paramsTypes[key])
            target.$paramsTypes[key] = types.map(function (type) { return type.name; });
        if (!target.routes)
            target.routes = [];
        target.routes.push({ method: 'get', params: target._params, path: path, auth: auth, handler: key });
        return prop;
    };
}
exports.GET = GET;
function RAW(method, path) {
    return function (target, key, prop) {
        if (!target.rawRoutes)
            target.rawRoutes = [];
        target.rawRoutes.push({ method: method, path: path, handler: key });
        return prop;
    };
}
exports.RAW = RAW;
function POST(path, auth) {
    if (auth === void 0) { auth = true; }
    return function (target, key, prop) {
        var types = Reflect['getMetadata']("design:paramtypes", target, key);
        if (!target.$paramsTypes)
            target.$paramsTypes = {};
        if (!target.$paramsTypes[key])
            target.$paramsTypes[key] = types.map(function (type) { return type.name; });
        if (!target.routes)
            target.routes = [];
        target.routes.push({ method: 'post', params: target._params, path: path, auth: auth, handler: key });
        return prop;
    };
}
exports.POST = POST;
function ROUTE(path) {
    return function (target) {
        target.prototype.routesPath = path;
        return target;
    };
}
exports.ROUTE = ROUTE;
function p(name, key, index) {
    if (typeof name === "string") {
        return function (target, key, index) {
            if (!target._params)
                target._params = {};
            if (!target._params[key])
                target._params[key] = [];
            target._params[key][index] = { type: '$params', name: name };
        };
    }
    else {
        var target = name;
        if (!target._params)
            target._params = {};
        if (!target._params[key])
            target._params[key] = [];
        target._params[key][index] = '$params';
    }
}
exports.p = p;
function u(name, key, index) {
    if (typeof name === "string") {
        return function (target, key, index) {
            if (!target._params)
                target._params = {};
            if (!target._params[key])
                target._params[key] = [];
            target._params[key][index] = { type: '$user', name: name };
        };
    }
    else {
        var target = name;
        if (!target._params)
            target._params = {};
        if (!target._params[key])
            target._params[key] = [];
        target._params[key][index] = '$user';
    }
}
exports.u = u;
function r(name, key, index) {
    if (typeof name === "string") {
        return function (target, key, index) {
            if (!target._params)
                target._params = {};
            if (!target._params[key])
                target._params[key] = [];
            target._params[key][index] = { type: '$request', name: name };
        };
    }
    else {
        var target = name;
        if (!target._params)
            target._params = {};
        if (!target._params[key])
            target._params[key] = [];
        target._params[key][index] = '$request';
    }
}
exports.r = r;
var express = require('express');
var bodyParser = require('body-parser');
function bootstrap(options) {
    var modules = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        modules[_i - 1] = arguments[_i];
    }
    var app = options.express || express();
    var httpsServer;
    if (options.https) {
        httpsServer = https.createServer(options.https, app);
    }
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    if (options.cors || options.cors == undefined) {
        app.use(function (req, res, next) {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
            res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
            next();
        });
    }
    if (options.parseUser) {
        app.use(function (req, res, next) {
            options.parseUser(req).then(next).catch(next);
        });
    }
    if (options.pretty || options.pretty == undefined) {
        app.set('json spaces', 2);
    }
    var router = new ApiRouter(app);
    app.get('/clover.json', function (req, res) {
        res.json(app.api);
    });
    if (options.port) {
        if (options.https) {
            httpsServer.listen(options.port, function () {
                console.log('TLS App Started at port: ' + options.port + ' !');
            });
        }
        else {
            app.listen(options.port, function () {
                console.log('App Started at port: ' + options.port + ' !');
            });
        }
    }
    for (var _a = 0, modules_1 = modules; _a < modules_1.length; _a++) {
        var modul = modules_1[_a];
        router.add(modul);
    }
    return router;
}
exports.bootstrap = bootstrap;
//# sourceMappingURL=index.js.map