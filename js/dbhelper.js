/**
 * Common database helper functions.
 */

const DATABASE_NAME = 'restarauntsDB';
const RESTAURANT_STORE = 'restaurants';
const REVIEW_STORE = 'reviews';
const OFFLINE_STORE = 'offline';

// const getAllRestaurants = () => {
//   return fetch(DBHelper.DATABASE_URL)
//     .then(handleFetchErrors)
//     .then(response => response.json())
//     .then(arrayOfRestuarants => {
//       return arrayOfRestuarants;
//     }).catch( error => {
//       console.log(error);
//     });
// }

class DBHelper {
  /**
   * Database name and store
   */
  static get DATABASE_NAME() {
    return DATABASE_NAME;
  }

  static get RESTAURANT_STORE() {
    return RESTAURANT_STORE;
  }

  /**
   * Remote Database URL.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants/`;
  }

  /**
   * Open Browser Database
   * Create all indexedDB stores
   */
  static openDatabase() {
    // If service worker is not supported don't use database
    if (!navigator.serviceWorker) {
      return Promise.resolve();
    }
    return idb.open(DBHelper.DATABASE_NAME, 1, updateDB => {
      switch(updateDB.oldVersion) {
        case 0:
          updateDB.createObjectStore(DBHelper.RESTAURANT_STORE, { 
            keyPath: 'id',
            unique: true
          });
        // TODO create index for RESTAURANT_STORE on is_favorite
        // case 1:
        // var restaurantStore = upgradeDB.transaction.objectStore(DBHelper.RESTAURANT_STORE);
        // restaurantStore.createIndex('favoriteRestaurants', 'is_favorite');
        // case 2:
        //   const reviewStore = upgradeDB.createObjectStore('reviews', {
        //     autoIncrement: true 
        //   });
        //   reviewStore.createIndex('restaurant_id', 'restaurant_id');
        // case 3:
        //   upgradeDB.createObjectStore('offline', { autoIncrement: true });
      }
    });
  }

  /**
   * Access all indexDB methods for local db CRUD
   * @return {[type]} [description]
   */
  static indexDB() {
    return {
      get(store, key) {
        return DBHelper.openDatabase().then(db => {
          return db
            .transaction(store)
            .objectStore(store)
            .get(key);
        });
      },
      getAll(store) {
        return DBHelper.openDatabase().then(db => {
          return db
            .transaction(store)
            .objectStore(store)
            .getAll();
        });
      },
      getAllIdx(store, idx, key) {
        return DBHelper.openDatabase().then(db => {
          return db
            .transaction(store)
            .objectStore(store)
            .index(idx)
            .getAll(key);
        });
      },
      set(store, val) {
        return DBHelper.openDatabase().then(db => {
          const tx = db.transaction(store, 'readwrite');
          tx.objectStore(store).put(val);
          return tx.complete;
        });
      },
      setReturnId(store, val) {
        return DBHelper.openDatabase().then(db => {
          const tx = db.transaction(store, 'readwrite');
          const pk = tx
            .objectStore(store)
            .put(val);
          tx.complete;
          return pk;
        });
      },
      delete(store, key) {
        return DBHelper.openDatabase().then(db => {
          const tx = db.transaction(store, 'readwrite');
          tx.objectStore(store).delete(key);
          return tx.complete;
        });
      },
      openCursor(store) {
        return DBHelper.openDatabase().then(db => {
          return db.transaction(store, 'readwrite')
            .objectStore(store)
            .openCursor();
        });
      }
    }
  };

  /**
   * Retrieve all restaurants from cache
   */
  static getCachedRestaurants() {
    return DBHelper.indexDB().getAll(DBHelper.RESTAURANT_STORE);
    // return DBHelper.openDatabase().then(db => {
    //   if (!db) return;
    //   const restaurants = db.transaction(DBHelper.RESTAURANT_STORE)
    //     .objectStore(DBHelper.RESTAURANT_STORE);
    //   return restaurants.getAll();
    // });
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {    
    // Get offline data first then remote and update database
    
    const restaurantData = DBHelper.getCachedRestaurants().then(restaurantsCache => {
      return (restaurantsCache.length && restaurantsCache) || fetch(DBHelper.DATABASE_URL)
        .then(fetchResponse => fetchResponse.json())
        .then(arrayOfRestuarants => {
          return DBHelper.openDatabase().then(db => {
            const tx = db.transaction(DBHelper.RESTAURANT_STORE, 'readwrite');
            const store = tx.objectStore(DBHelper.RESTAURANT_STORE);
            arrayOfRestuarants.forEach(restaurant => {
              store.put(restaurant);
            })
            return arrayOfRestuarants;
          });
        }).catch(err => callback(`Remote Request failed. Returned status of ${err.statusText}`, null));
    });

    restaurantData.then(finalData => {
      callback(null, finalData);
    }).catch(err => callback(`Request failed. Returned status of ${err.statusText}`, null));
    // const cachedData = DBHelper.getCachedRestaurants();
    // if (cachedData) {
    //   callback(null, cachedData);
    //   console.log('Data from db');
    // }
    
    // DBHelper.openDatabase().then(db => {
    //   if (!db) return;
    //   const restaurants = db.transaction(DBHelper.RESTAURANT_STORE)
    //     .objectStore(DBHelper.RESTAURANT_STORE);
    //   return restaurants.getAll().then(restaurantsCache => {
    //     if (!restaurantsCache.length) return;
    //     callback(null, restaurantsCache);
    //     console.log('Data from db');
    //   });
    // });

    // .then(data => callback(null, data)) //TODO need to handle fetch event here
    // .catch(err => callback(`Request failed. Returned status of ${err.statusText}`, null));

    // const fetchData = getAllRestaurants();
    // if (fetchData) console.log(fetchData);
    
    // fetch(DBHelper.DATABASE_URL)
    //   .then(handleFetchErrors)
    //   .then(response => response.json())
    //   .then(arrayOfRestuarants => {
    //     callback(null, arrayOfRestuarants);
    //     DBHelper.openDatabase().then(db => {
    //       const tx = db.transaction(DBHelper.RESTAURANT_STORE, 'readwrite');
    //       const store = tx.objectStore(DBHelper.RESTAURANT_STORE);
    //       arrayOfRestuarants.forEach(restaurant => {
    //         store.put(restaurant);
    //       })
    //       return tx.complete;
    //     });
    //   }).catch( error => {
    //     console.log(error);
    //   })

      //callback(null, fetchData);
      // .then(jsonData => callback(null, jsonData.clone()))
      // .then(DBHelper.openDatabase()
      //   .then(db => {
      //     const tx = db.transaction(DBHelper.RESTAURANT_STORE, 'readwrite');
      //     const store = tx.objectStore(DBHelper.RESTAURANT_STORE);
      //     jsonData.forEach(restaurant => {
      //       store.put(restaurant);
      //     })
      //     return tx.complete;
      //   })
      // )
      // .catch(err => callback(`Request failed. Returned status of ${err.statusText}`, null));
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant, type = 'thumbs') {
    if (!restaurant.photograph) {
      return (`/img/empty-plate.jpg`);
    }
    return (`/img/${type}/${restaurant.photograph}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 

  /**
   * Restaurant Favorites
   */
  static updateFavoriteRestaurant(restaurant, isfav) {
    const id = restaurant.id;
    fetch(`${DBHelper.DATABASE_URL}${id}/?is_favorite=${isfav}`, {
      method: 'PUT'
    })
    .then(fetchResponse => fetchResponse.json())
    .then(restaurant => {
      return DBHelper.indexDB().set(DBHelper.RESTAURANT_STORE, restaurant)
    }).catch(err => console.log(`Remote Request failed. Returned status of ${err.statusText}`));
  }

  /**
   * Helper Functions
   */

  static handleFetchErrors(fetchResponse) {
    if(!fetchResponse.ok) {
      console.log(fetchResponse.statusText);
    }
    return fetchResponse;
  };

  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}