// TODO: append hash version number to STATIC_CACHE and static files to cache 
const STATIC_CACHE = 'app-static-v14';
const DYNAMIC_CACHE = 'app-dynamic';
const ALL_CACHES = [
	STATIC_CACHE,
	DYNAMIC_CACHE
];

// On Service Worker install cache static assets
self.addEventListener('install', event => {
	event.waitUntil(
		caches.open(STATIC_CACHE).then( cache => {
			return cache.addAll([
				'/index.html',
				'/restaurant.html',
				'/manifest.json',
				'/css/styles.css',
				'/img/empty-plate.jpg',
				'/img/icons/fav-heart-sprite.png',
				'/js/dbhelper.js',
				'/js/idb.js',
				'/js/main.js',
				'/js/register.js',
				'/js/restaurant_info.js'
			]);
		}).catch( error => {
			console.log(error);
		})
	);
});

// On Service Worker activation clear the previous static cache versions
self.addEventListener('activate', event => {
	event.waitUntil(
		caches.keys().then(cacheNames => {
			return Promise.all(
				cacheNames.filter(cacheName => {
					return cacheName.startsWith('app-') && !ALL_CACHES.includes(cacheName);
				}).map(cacheName => {
					return caches.delete(cacheName);
				})
			);
		})
	);
})

self.addEventListener('fetch', event => {
	const requestURL = new URL(event.request.url);
	if (requestURL.origin === location.origin) {
		if (requestURL.pathname === '/') {
			event.respondWith(caches.match('index.html'));
			return;
		} 
		// restaurant.html will handle all restaurant requests (process url id's)
		if (requestURL.pathname.startsWith('/restaurant.html')) {
			event.respondWith(caches.match('restaurant.html'));
			return;
		}
	// Intercept fetch API calls for restaurant data  
	} else if (requestURL.port === '1337') {
		return;
		// TODO: PUT and POST should pass through
		// if (event.request.method !== GET) {
		// 	return;
		// } else {
		// 	event.respondWith(someCacheFunction);
		// 	event.waitUntil(someFetchFunction().then(refresh));
		// }
		// TODO: GET requests should try and use idb cache
		// GET requests should respond with idb cache data then get fresh data, recache and refresh
	}

	event.respondWith(
		caches.match(event.request)
		.then(response => {
			return response || fetch(event.request)
				.then(handleFetchErrors)
				.then(fetchResponse => {
					return caches.open(DYNAMIC_CACHE)
						.then(cache => {
							cache.put(event.request, fetchResponse.clone());
							return fetchResponse;
						})
				})
				// error handler borrowed from Doug Brown presentation
				.catch(error => {
					if(event.request.url.indexOf('/img/') > -1) {
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
	// TODO review the following - if(!response || response.status !== 200 || response.type !== 'basic')
	// example here - https://developers.google.com/web/fundamentals/primers/service-workers/
	if(!fetchResponse.ok) {
		console.log(fetchResponse.statusText);
	}
	return fetchResponse;
}