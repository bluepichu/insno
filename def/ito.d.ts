declare enum RecongizerResponse {
    ACCEPT = 0,
    REJECT = 1,
    WAIT = 2,
}
declare const ACCEPT: RecongizerResponse;
declare const REJECT: RecongizerResponse;
declare const WAIT: RecongizerResponse;
declare type RecognizerMatcher = (event: TouchEvent, state: any) => RecongizerResponse;
interface Recognizer {
    match: RecognizerMatcher;
    next: GestureNode;
}
declare class GestureGraph {
    private _element;
    private _nodes;
    private _clearNode;
    private _startNode;
    private _currentNode;
    private _listeners;
    state: any;
    constructor(element: Element);
    private handleTouch(event);
    start(node?: GestureNode | string): GestureNode;
    setNodeName(node: GestureNode, name: string): void;
    moveToNode(node: GestureNode | string): void;
    private getNode(node);
    reset(): void;
    fire(events: [string, any][]): void;
    addEventListener(event: string, listener: () => void): void;
    listen(): void;
    wait(): void;
}
declare class GestureNode {
    private _parent;
    private _name;
    private _events;
    private _recognizers;
    private _timeout;
    private _currentRecognizers;
    private _currentTimeout;
    private _goto;
    constructor(parent: GestureGraph);
    name(name: string): GestureNode;
    fire(evt: string | ((state: any) => string) | ((state: any) => [string, any])): GestureNode;
    then(matcher: RecognizerMatcher): GestureNode;
    timeout(time: number): GestureNode;
    enter(): void;
    handleTouch(event: TouchEvent): void;
    private wait();
    private advanceTo(node);
    goto(node: GestureNode | string): void;
}
declare class Ito extends GestureGraph {
    static ACCEPT: RecongizerResponse;
    static REJECT: RecongizerResponse;
    static WAIT: RecongizerResponse;
}
