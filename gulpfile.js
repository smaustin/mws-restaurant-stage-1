var gulp = require('gulp');
var responsive = require('gulp-responsive-images');
// var plugins = require('gulp-load-plugins')({
//   rename: {
//     'gulp-responsive-images': 'responsive'
//   }
// });
var del = require('del');
var browserSync = require('browser-sync').create();
//TODO: may need prefixes for flexbox
//var autoprefixer = require('gulp-autoprefixer');
// TODO: may want to use sw-precache in future
// var swPrecache = require('sw-precache');

// gulp.task('generate-sw', function() {
//   var swOptions = {
//     staticFileGlobs: [
//       './index.html',
//       './img/*.*/*.{png,svg,gif,jpg}',
//       './js/*.js',
//       './css/*.css'
//     ],
//     stripPrefix: '.'
//   };
//   return swPrecache.write('./service-worker.js', swOptions);
// });

gulp.task('images', function() {
  // create thumbs
  gulp.src('img/*.jpg')
    .pipe(responsive({
      '!empty-plate.jpg': [{
        width: 375,
        suffix: '_1x',
        quality: 60
      }, {
        width: 750,
        suffix: '_2x',
        quality: 60
      }]
    }))
    .pipe(gulp.dest('img/thumbs'));
  // create banners
  gulp.src('img/*.jpg')  
    .pipe(responsive({
      '!empty-plate.jpg': [{
        // height: 400,
        // crop: true,
        // gravity: 'Center',
        width: 400,
        suffix: '_1x',
        quality: 60
      }, {
        // height: 800,
        // crop: true,
        // gravity: 'Center',
        width: 900,
        suffix: '_2x',
        quality: 60
      }]
    }))
    .pipe(gulp.dest('img/banners'));
});

gulp.task('serve', function() {
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
    'img/*.*/*.jpg',
    '!service-worker.js',
    '!gulpfile.js'
  ], [browserSync.reload]);
});

gulp.task('default', ['serve']);
