var STATIC_CACHE = 'app-static-v6';
var IMG_CACHE = 'app-content-imgs'; //TODO
var ALL_CACHES = [
	STATIC_CACHE,
	IMG_CACHE
];
 
self.addEventListener('install', event => {
	event.waitUntil(
		caches.open(STATIC_CACHE).then( cache => {
			return cache.addAll([
				'/',
				"/index.html",
				"/restaurant.html",
				"/css/styles.css",
				//"/data/restaurants.json",
				"/img/empty-plate.jpg",
				"/js/dbhelper.js",
				"/js/main.js",
				"/js/register.js",
				"/js/restaurant_info.js"
			]);
		}).catch( error => {
			console.log(error);
		})
	);
});

self.addEventListener('activate', event => {
	event.waitUntil(
		caches.keys().then(cacheNames => {
			return Promise.all(
				cacheNames.filter(cacheName => {
					return cacheName.startsWith('app-static') && !ALL_CACHES.includes(cacheName);
				}).map(cacheName => {
					return caches.delete(cacheName);
				})
			);
		})
	);
})

self.addEventListener('fetch', event => {
	event.respondWith(
		caches.match(event.request, {ignoreSearch: true})
		.then(response => {
			return response || fetch(event.request)
				.then(handleFetchErrors)
				.then(fetchResponse => {
					return caches.open(STATIC_CACHE)
				.then(cache => {
					cache.put(event.request, fetchResponse);
					return fetchResponse.clone();
				})
			})
			// error handler borrowed from Doug Brown presentation
			.catch(error => {
				if(event.request.url.indexOf('.jpg') > -1) {
					return caches.match('/img/empty-plate.jpg');
				}
				return new Response('Internet connection failed', {
					status: 404,
					statusText: 'Internet connection failed'
				});
			});
		})
	);
});

function handleFetchErrors(fetchResponse) {
	if(!fetchResponse.ok) {
		console.log(fetchResponse.statusText);
	}
	return fetchResponse;
}