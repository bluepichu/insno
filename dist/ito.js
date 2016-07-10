"use strict";

var __extends = undefined && undefined.__extends || function (d, b) {
    for (var p in b) {
        if (b.hasOwnProperty(p)) d[p] = b[p];
    }function __() {
        this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var RecongizerResponse;
(function (RecongizerResponse) {
    RecongizerResponse[RecongizerResponse["ACCEPT"] = 0] = "ACCEPT";
    RecongizerResponse[RecongizerResponse["REJECT"] = 1] = "REJECT";
    RecongizerResponse[RecongizerResponse["WAIT"] = 2] = "WAIT";
})(RecongizerResponse || (RecongizerResponse = {}));
var ACCEPT = RecongizerResponse.ACCEPT;
var REJECT = RecongizerResponse.REJECT;
var WAIT = RecongizerResponse.WAIT;
var GestureGraph = function () {
    function GestureGraph(element) {
        this._element = element;
        this._nodes = {};
        this._clearNode = new GestureNode(this);
        this._startNode = this._clearNode.then(function (event) {
            return event.type === "touchend" && event.touches.length === 0 ? ACCEPT : WAIT;
        });
        this._currentNode = undefined;
        this._listeners = {};
        this.state = {};
    }
    GestureGraph.prototype.handleTouch = function (event) {
        this._currentNode.handleTouch(event);
        event.preventDefault();
    };
    GestureGraph.prototype.start = function (node) {
        var start = undefined;
        if (node !== undefined) {
            start = this.getNode(node);
        } else {
            start = this._startNode;
        }
        if (start === undefined) {
            throw new Error("Ito Error: illegal state");
        }
        return start;
    };
    GestureGraph.prototype.setNodeName = function (node, name) {
        if (name in this._nodes) {
            throw new Error("Ito Error: GestureNode with name \"" + name + "\" already exists");
        }
        this._nodes[name] = node;
    };
    GestureGraph.prototype.moveToNode = function (node) {
        this._currentNode = this.getNode(node);
        this._currentNode.enter();
    };
    GestureGraph.prototype.getNode = function (node) {
        if (typeof node === "string") {
            if (node in this._nodes) {
                return this._nodes[node];
            } else {
                throw new Error("Ito Error: node with name \"" + node + "\" not found");
            }
        } else {
            return node;
        }
    };
    GestureGraph.prototype.reset = function () {
        this.moveToNode(this._startNode);
    };
    GestureGraph.prototype.fire = function (events) {
        var _this = this;
        events.forEach(function (event) {
            if (event in _this._listeners) {
                _this._listeners[event].forEach(function (listener) {
                    listener();
                });
            }
        });
    };
    GestureGraph.prototype.addEventListener = function (event, listener) {
        if (!(event in this._listeners)) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(listener);
    };
    GestureGraph.prototype.listen = function () {
        if (this._currentNode !== undefined) {
            throw new Error("Ito Error: this instance is already listening");
        }
        var handler = this.handleTouch.bind(this);
        this._element.addEventListener("touchstart", handler);
        this._element.addEventListener("touchend", handler);
        this._element.addEventListener("touchmove", handler);
        this.reset();
    };
    GestureGraph.prototype.wait = function () {
        this.moveToNode(this._clearNode);
    };
    return GestureGraph;
}();
var GestureNode = function () {
    function GestureNode(parent) {
        this._parent = parent;
        this._name = undefined;
        this._events = [];
        this._recognizers = [];
        this._timeout = undefined;
        this._currentRecognizers = undefined;
        this._currentTimeout = undefined;
        this._goto = undefined;
    }
    GestureNode.prototype.name = function (name) {
        if (this._name !== undefined) {
            throw new Error("Ito Error: GestureNode \"" + this._name + "\" is already named and cannot be renamed");
        }
        this._parent.setNodeName(this, name);
        this._name = name;
        return this;
    };
    GestureNode.prototype.fire = function (evt) {
        this._events.push(evt);
        return this;
    };
    GestureNode.prototype.then = function (matcher) {
        var next = new GestureNode(this._parent);
        this._recognizers.push({
            match: matcher,
            next: next
        });
        return next;
    };
    GestureNode.prototype.timeout = function (time) {
        var next = new GestureNode(this._parent);
        this._timeout = {
            time: time,
            next: next
        };
        return next;
    };
    GestureNode.prototype.enter = function () {
        var _this = this;
        var events = [];
        this._events.forEach(function (event) {
            var evts;
            if (typeof event === "string") {
                evts = event;
            } else {
                evts = event(_this._parent.state);
            }
            events = events.concat(evts.trim().split(/\s+/g).filter(function (ev) {
                return ev !== "";
            }));
        });
        this._parent.fire(events);
        if (this._goto !== undefined) {
            this._parent.moveToNode(this._goto);
            return;
        }
        this._currentRecognizers = this._recognizers.slice();
        if (this._timeout !== undefined) {
            this._currentTimeout = setTimeout(function () {
                return _this.advanceTo(_this._timeout.next);
            }, this._timeout.time);
        }
        if (this._currentRecognizers.length === 0 && this._timeout === undefined) {
            this.wait();
        }
    };
    GestureNode.prototype.handleTouch = function (event) {
        clearTimeout(this._currentTimeout);
        for (var i = 0; i < this._currentRecognizers.length; i++) {
            switch (this._currentRecognizers[i].match(event, this._parent.state)) {
                case ACCEPT:
                    this.advanceTo(this._currentRecognizers[i].next);
                    return;
                case REJECT:
                    this._currentRecognizers.splice(i, 1);
                    i--;
                    break;
                case WAIT:
                    break;
                default:
                    throw new Error("Ito Error: invalid return from matcher (not ACCEPT, REJECT, or WAIT)");
            }
        }
        if (this._currentRecognizers.length === 0) {
            this.wait();
        }
    };
    GestureNode.prototype.wait = function () {
        clearTimeout(this._currentTimeout);
        this._parent.wait();
    };
    GestureNode.prototype.advanceTo = function (node) {
        clearTimeout(this._currentTimeout);
        this._currentRecognizers = undefined;
        this._currentTimeout = undefined;
        this._parent.moveToNode(node);
    };
    GestureNode.prototype.goto = function (node) {
        this._goto = node;
    };
    return GestureNode;
}();
var Ito = function (_super) {
    __extends(Ito, _super);
    function Ito() {
        _super.apply(this, arguments);
    }
    Ito.ACCEPT = ACCEPT;
    Ito.REJECT = REJECT;
    Ito.WAIT = WAIT;
    return Ito;
}(GestureGraph);
//# sourceMappingURL=ito.js.map
