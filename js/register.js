if (navigator.serviceWorker) {
	navigator.serviceWorker.register('/sw.js').then(reg => {
		console.log("Service worker registered:" + reg.scope);
	}).catch(error => {
		console.log("Service worker failed:" + error);
	});
}