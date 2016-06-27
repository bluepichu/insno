"use strict";

enum RecongizerResponse {
	ACCEPT,
	REJECT,
	WAIT
}

const ACCEPT = RecongizerResponse.ACCEPT;
const REJECT = RecongizerResponse.REJECT;
const WAIT = RecongizerResponse.WAIT;

type RecognizerMatcher = (event: TouchEvent, state: any) => RecongizerResponse;

interface Recognizer {
	match: RecognizerMatcher;
	next: GestureNode;
}

class GestureGraph {
	private _element: Element;
	private _nodes: { [key: string]: GestureNode }; // TODO(bluepichu): Replace with ES6 map when support is good
	private _clearNode: GestureNode;
	private _startNode: GestureNode;
	private _currentNode: GestureNode;
	private _listeners: { [key: string]: (() => void)[] };

	public state: any;

	public constructor(element: Element) {
		this._element = element;
		this._nodes = {};
		this._clearNode = new GestureNode(this);
		this._startNode =
			this._clearNode.then((event) => event.type === "touchend" && event.touches.length === 0 ? ACCEPT : WAIT);
		this._currentNode = undefined;
		this._listeners = {};

		this.state = {};
	}

	private handleTouch(event: TouchEvent): void {
		this._currentNode.handleTouch(event);
		event.preventDefault();
	}

	public start(node?: GestureNode | string): GestureNode {
		let start: GestureNode = undefined;

		if (node !== undefined) {
			start = this.getNode(node);
		} else {
			start = this._startNode;
		}

		if (start === undefined) {
			throw new Error(`Ito Error: illegal state`);
		}

		return start;
	}

	public setNodeName(node: GestureNode, name: string): void {
		if (name in this._nodes) {
			throw new Error(`Ito Error: GestureNode with name "${name}" already exists`);
		}

		this._nodes[name] = node;
	}

	public moveToNode(node: GestureNode | string): void {
		this._currentNode = this.getNode(node);
		this._currentNode.enter();
	}

	private getNode(node: GestureNode | string): GestureNode {
		if (typeof node === "string") {
			if (node in this._nodes) {
				return this._nodes[node];
			} else {
				throw new Error(`Ito Error: node with name "${node}" not found`);
			}
		} else {
			return node;
		}
	}

	public reset(): void {
		this.moveToNode(this._startNode);
	}

	public fire(events: string[]): void {
		events.forEach((event) => {
			if (event in this._listeners) {
				this._listeners[event].forEach((listener) => {
					listener();
				});
			}
		});
	}

	public addEventListener(event: string, listener: () => void) {
		if (!(event in this._listeners)) {
			this._listeners[event] = [];
		}

		this._listeners[event].push(listener);
	}

	public listen(): void {
		if (this._currentNode !== undefined) {
			throw new Error(`Ito Error: this instance is already listening`);
		}

		let handler = this.handleTouch.bind(this);

		this._element.addEventListener("touchstart", handler);
		this._element.addEventListener("touchend", handler);
		this._element.addEventListener("touchmove", handler);

		this.reset();
	}

	public wait(): void {
		this.moveToNode(this._clearNode);
	}
}

class GestureNode {
	private _parent: GestureGraph;
	private _name: string | void;
	private _events: (string | ((state: any) => string))[];
	private _recognizers: Recognizer[];
	private _timeout: { time: number, next: GestureNode };
	private _currentRecognizers: Recognizer[];
	private _currentTimeout: number;
	private _goto: GestureNode | string | void;

	public constructor(parent: GestureGraph) {
		this._parent = parent;
		this._name = undefined;
		this._events = [];
		this._recognizers = [];
		this._timeout = undefined;
		this._currentRecognizers = undefined;
		this._currentTimeout = undefined;
		this._goto = undefined;
	}

	public name(name: string): GestureNode {
		if (this._name !== undefined) {
			throw new Error(`Ito Error: GestureNode "${this._name}" is already named and cannot be renamed`);
		}

		this._parent.setNodeName(this, name);
		this._name = name;

		return this;
	}

	public fire(evt: string | ((state: any) => string)): GestureNode {
		this._events.push(evt);

		return this;
	}

	public then(matcher: RecognizerMatcher): GestureNode {
		let next = new GestureNode(this._parent);

		this._recognizers.push({
			match: matcher,
			next: next
		});

		return next;
	}

	public timeout(time: number): GestureNode {
		let next = new GestureNode(this._parent);

		this._timeout = {
			time: time,
			next: next
		};

		return next;
	}

	public enter(): void {
		let events: string[] = [];

		this._events.forEach((event) => {
			let evts: string;

			if (typeof event === "string") {
				evts = event;
			} else {
				evts = event(this._parent.state);
			}

			events = events.concat(evts.trim().split(/\s+/g).filter((ev) => ev !== ""));
		});

		this._parent.fire(events);

		if (this._goto !== undefined) {
			this._parent.moveToNode(this._goto as GestureNode | string);
			return;
		}

		this._currentRecognizers = this._recognizers.slice();

		if (this._timeout !== undefined) {
			this._currentTimeout = setTimeout(() => this.advanceTo(this._timeout.next), this._timeout.time);
		}

		if (this._currentRecognizers.length === 0 && this._timeout === undefined) {
			this.wait();
		}
	}

	public handleTouch(event: TouchEvent): void {
		clearTimeout(this._currentTimeout);

		for (let i = 0; i < this._currentRecognizers.length; i++) {
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
					throw new Error(`Ito Error: invalid return from matcher (not ACCEPT, REJECT, or WAIT)`);
			}
		}

		if (this._currentRecognizers.length === 0) {
			this.wait();
		}
	}

	private wait(): void {
		clearTimeout(this._currentTimeout);
		this._parent.wait();
	}

	private advanceTo(node: GestureNode): void {
		clearTimeout(this._currentTimeout);
		this._currentRecognizers = undefined;
		this._currentTimeout = undefined;
		this._parent.moveToNode(node);
	}

	public goto(node: GestureNode | string): void {
		this._goto = node;
	}
}

this.Ito = GestureGraph;
this.Ito.ACCEPT = ACCEPT;
this.Ito.REJECT = REJECT;
this.Ito.WAIT = WAIT;