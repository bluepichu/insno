"use strict";

let log     = require("beautiful-log");
let express = require("express");
let path    = require("path");

const app = express();
const PORT = 1234;

app.use(express.static(__dirname));

const server = app.listen(PORT, function() {
	log.info("Listening on *:" + PORT);
});