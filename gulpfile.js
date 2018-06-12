var gulp = require('gulp');
var del = require('del');
var browserSync = require('browser-sync').create();
//TODO: may need prefixes for flexbox
//var autoprefixer = require('gulp-autoprefixer');
var swPrecache = require('sw-precache');

gulp.task('generate-sw', function() {
  var swOptions = {
    staticFileGlobs: [
      './index.html',
      './images/*.{png,svg,gif,jpg}',
      './js/*.js',
      './css/*.css'
    ],
    stripPrefix: '.'
  };
  return swPrecache.write('./service-worker.js', swOptions);
});

gulp.task('serve', ['generate-sw'], function() {
  browserSync.init({
    notify: false,
    logPrefix: 'restaurantApp',
    server: './',
    port: 8000
  });
  gulp.watch([
    '*.html',
    'js/*.js',
    'css/*.css',
    '!service-worker.js',
    '!gulpfile.js'
  ], ['generate-sw', browserSync.reload]);
});

gulp.task('default', ['serve']);
