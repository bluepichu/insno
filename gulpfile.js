"use strict";

let es2015        = require("babel-preset-es2015");
let gulp          = require("gulp");
let path          = require("path");
let rollup        = require("rollup").rollup;
let sorcery       = require("sorcery");

let $             = require("gulp-load-plugins")({ pattern: ["gulp-*", "gulp.*"] });

let tsProject = $.typescript.createProject(path.join(__dirname, "tsconfig.json"));

gulp.task("default", ["build", "minify"]);

gulp.task("watch", () => {
	gulp.watch("src/**/*.*", ["build"])
});

gulp.task("build", () =>
	gulp.src("src/**/*.ts")
	    .pipe($.sourcemaps.init())
	    .pipe($.typescript(tsProject))
		.pipe($.babel({ presets: [es2015] }))
		.pipe($.sourcemaps.write("."))
	    .pipe(gulp.dest("dist")));

gulp.task("minify", ["build"], () =>
	gulp.src("dist/ito.js")
	    .pipe($.sourcemaps.init())
		.pipe($.uglify())
		.pipe($.sourcemaps.write("."))
		.pipe($.debug())
		.pipe($.rename((path) => path.basename = "ito.min" + path.basename.substring(3)))
		.pipe($.debug())
		.pipe(gulp.dest("dist")));