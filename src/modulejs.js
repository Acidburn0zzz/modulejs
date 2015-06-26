(function (root, factory) {

root.modulejs = factory(); // jshint ignore: line

}(this, function () {
    'use strict';

    var _obj_proto = Object.prototype;
    var _arr_proto = Array.prototype;
    var _arr_forEach = _arr_proto.forEach;
    var _arr_indexOf = _arr_proto.indexOf;

    // Returns a function that returns `true` if `x` is of the correct
    // `type`, otherwise `false`.
    function _create_is_x_fn(type) {
        return function (x) {
            return _obj_proto.toString.call(x) === '[object ' + type + ']';
        };
    }

    // Type checking functions.
    var isArray = Array.isArray;
    var isFunction = _create_is_x_fn('Function');
    var isObject = _create_is_x_fn('Object');
    var isString = _create_is_x_fn('String');

    function is(x) {
        return x !== undefined && x !== null;
    }

    // Short cut for `hasOwnProperty`.
    function has(x, id) {
        return is(x) && _obj_proto.hasOwnProperty.call(x, id);
    }

    // Iterates over all elements af an array or all own keys of an object.
    function each(x, fn, ctx) {
        if (is(x) && isFunction(fn)) {
            if (is(x.length)) {
                _arr_forEach.call(x, fn, ctx);
            } else {
                Object.keys(x).forEach(function (key) {
                    fn.call(ctx, x[key], key, x);
                });
            }
        }
    }

    // Returns `true` if array contains `element`, otherwise `false`.
    function contains(x, val) {
        return is(x) && _arr_indexOf.call(x, val) >= 0;
    }

    // Returns an new array containing no duplicates. Preserves first
    // occurence and order.
    function uniq(array) {
        var elements = {};
        var result = [];

        each(array, function (el) {
            if (!has(elements, el)) {
                result.push(el);
                elements[el] = 1;
            }
        });

        return result;
    }

    // Throws an error if `expression` is falsy.
    function assert(expression, message) {
        if (!expression) {
            throw new Error('[modulejs] ' + message);
        }
    }

    function create() {
        // Module definitions.
        var definitions = {};

        // Module instances.
        var instances = {};

        // Resolves an `id` to an object, or if `onlyDepIds` is `true` only
        // returns dependency-ids. `stack` is used internal to check for
        // circular dependencies.
        // If defined, `resolvedInstances` is used instead of the already
        // memorized `instances` to allow faking dependencies.
        function resolve(id, onlyDepIds, stack, resolvedInstances) {

            // check arguments
            assert(isString(id), 'id must be string: ' + id);

            // Use `resolvedInstances` if defined
            resolvedInstances = resolvedInstances || instances;

            // if a module is required that was already created return that
            // object
            if (!onlyDepIds && has(resolvedInstances, id)) {
                return resolvedInstances[id];
            }

            // check if `id` is defined
            var def = definitions[id];
            assert(def, 'id not defined: ' + id);

            // copy resolve stack and add this `id`
            stack = (stack || []).slice();
            stack.push(id);

            // if `onlyDepIds` this will hold the dependency-IDs, otherwise it
            // will hold the dependency-objects
            var deps = [];

            each(def.deps, function (depId) {

                // check for circular dependencies
                assert(!contains(stack, depId), 'circular dependencies: ' + depId + ' in ' + stack);

                if (onlyDepIds) {
                    deps = deps.concat(resolve(depId, onlyDepIds, stack));
                    deps.push(depId);
                } else {
                    deps.push(resolve(depId, onlyDepIds, stack, resolvedInstances));
                }
            });

            // if `onlyDepIds` return only dependency-ids in right order
            if (onlyDepIds) {
                return uniq(deps);
            }

            // create, memorize and return object
            var obj = def.fn.apply(undefined, deps);
            resolvedInstances[id] = obj;
            return obj;
        }

        // Defines a module for `id: String`, optional `deps: Array[String]`,
        // `def: Object/function`.
        function define(id, deps, def) {

            // sort arguments
            if (arguments.length === 2) {
                def = deps;
                deps = [];
            }
            // check arguments
            assert(isString(id), 'id must be string: ' + id);
            assert(!has(definitions, id), 'id already defined: ' + id);
            assert(isArray(deps), 'deps must be array: ' + id);

            // accept definition
            definitions[id] = {
                id: id,
                deps: deps,
                fn: isFunction(def) ? def : function () { return def; }
            };
        }

        // Returns an instance for `id`. If a `fakeInstances` object is given,
        // it is used to resolve the dependencies.
        function require(id, fakeInstances) {

            return resolve(id, false, [], fakeInstances);
        }

        // Returns an object that holds infos about the current definitions
        // and dependencies.
        function state() {

            var res = {};

            each(definitions, function (def, id) {

                res[id] = {

                    // direct dependencies
                    deps: def.deps.slice(0),

                    // transitive dependencies
                    reqs: resolve(id, true),

                    // already initiated/required
                    init: has(instances, id)
                };
            });

            each(definitions, function (def, id) {

                var inv = [];
                each(definitions, function (def2, id2) {

                    if (contains(res[id2].reqs, id)) {
                        inv.push(id2);
                    }
                });

                // all inverse dependencies
                res[id].reqd = inv;
            });

            return res;
        }

        // Returns a string that displays module dependencies.
        function log(inv) {

            var out = '\n';

            each(state(), function (st, id) {

                var list = inv ? st.reqd : st.reqs;
                out += (st.init ? '* ' : '  ') + id + ' -> [ ' + list.join(', ') + ' ]\n';
            });

            return out;
        }

        return {
            create: create,
            define: define,
            log: log,
            require: require,
            state: state,
            _private: {
                assert: assert,
                contains: contains,
                definitions: definitions,
                each: each,
                has: has,
                instances: instances,
                isArray: isArray,
                isFunction: isFunction,
                isObject: isObject,
                isString: isString,
                resolve: resolve,
                uniq: uniq
            }
        };
    }

    return create();
}));
