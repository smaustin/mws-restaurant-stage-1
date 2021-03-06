/**
 * Common database helper functions.
 */

const DATABASE_NAME = 'restarauntsDB';
const RESTAURANT_STORE = 'restaurants';
const REVIEW_STORE = 'reviews';
const PENDING_STORE = 'pending';

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

  static get REVIEW_STORE() {
    return REVIEW_STORE;
  }

  static get PENDING_STORE() {
    return PENDING_STORE
  }
  /**
   * Remote Database URL.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}`;
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
    return idb.open(DBHelper.DATABASE_NAME, 4, updateDB => {
      switch(updateDB.oldVersion) {
        case 0:
          updateDB.createObjectStore(DBHelper.RESTAURANT_STORE, { 
            keyPath: 'id'
          });
        case 1:
          const restaurantStore = updateDB.transaction.objectStore(DBHelper.RESTAURANT_STORE);
          restaurantStore.createIndex('favorites', 'is_favorite');
        case 2:
          const reviewsStore = updateDB.createObjectStore(DBHelper.REVIEW_STORE, {
            autoIncrement: true 
          });
          reviewsStore.createIndex('restaurant_id', 'restaurant_id');
        case 3:
          updateDB.createObjectStore(DBHelper.PENDING_STORE, { 
            autoIncrement: true
          });
      }
    });
  }

  /**
   * Access all indexedDB methods for local db CRUDish operations
   * Based on https://github.com/jakearchibald/idb
   * Modified based on James Priest comments
   */
  static indexedDB() {
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
      getAllIdx(store, idx, key) { // Get all results from index (eg favorites)
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
          const pk = tx.objectStore(store).put(val);
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
   * Retrieve all restaurants from cache.
   */
  static getCachedRestaurants() {
    return DBHelper.indexedDB().getAll(DBHelper.RESTAURANT_STORE);
  }

  /**
   * Fetch all restaurants.
   * Primary request for restaurant data - get data from local storage, fall back to fetch
   */
  static fetchRestaurants(callback) {    
        
    const restaurantData = DBHelper.getCachedRestaurants().then(restaurantsCache => {
      return (restaurantsCache.length && restaurantsCache) || fetch(`${DBHelper.DATABASE_URL}/restaurants/`)
        .then(fetchResponse => fetchResponse.json())
        .then(arrayOfRestuarants => {
            arrayOfRestuarants.forEach(restaurant => {
              DBHelper.indexedDB().set(DBHelper.RESTAURANT_STORE, restaurant);
            });
            return arrayOfRestuarants;
        }).catch(err => callback(`Remote Request failed. Returned status of ${err.statusText}`, null));
    });

    restaurantData.then(finalData => {
      callback(null, finalData);
    }).catch(err => callback(`Request failed. Returned status of ${err.statusText}`, null));
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
   * Update Remote and Local Storage
   */
  static updateFavoriteRestaurant(restaurant, isfav) {
    const id = restaurant.id;
    fetch(`${DBHelper.DATABASE_URL}/restaurants/${id}/?is_favorite=${isfav}`, {
      method: 'PUT'
    })
    .then(fetchResponse => fetchResponse.json())
    .then(restaurant => {
      return DBHelper.indexedDB().set(DBHelper.RESTAURANT_STORE, restaurant)
    }).catch(err => console.log(`Remote Request failed. Returned status of ${err.statusText}`));
  }

  /**
   * Get All Restaurant Reviews 
   */
  static fetchReviewsByRestaurant(restaurant, callback) {
    const id = restaurant.id;
    const reviewData = DBHelper.indexedDB().getAllIdx(DBHelper.REVIEW_STORE, 'restaurant_id', id).then(reviewsCache => {
      return (reviewsCache.length && reviewsCache) || fetch(`${DBHelper.DATABASE_URL}/reviews/?restaurant_id=${id}`)
      .then(fetchResponse => fetchResponse.json())
      .then(arrayOfReviews => {
        arrayOfReviews.forEach(review => {
          DBHelper.indexedDB().set(DBHelper.REVIEW_STORE, review);
        });
        return arrayOfReviews;
      }).catch(err => callback(`Remote Request failed. Returned status of ${err.statusText}`, null));
    });

    reviewData.then(finalData => {
      callback(null, finalData);
    }).catch(err => callback(`Request failed. Returned status of ${err.statusText}`, null));
  }

  static addRestaurantReview(restaurant_id, name, rating, comment_text, callback) {
    const body = {
      restaurant_id: restaurant_id,
      name: name,
      rating: rating,
      comments: comment_text
    };
    const url = `${DBHelper.DATABASE_URL}/reviews/`;
    const method = 'POST';
    const headers = { 'Content-Type': 'application/json'}
    // TODO May want to check for online/offline here
    // if (!navigator.onLine) {
    // DBHelper.addRequestToPending();
    // return;
    // }
    fetch(url, {
      method: method,
      headers: headers,
      body: JSON.stringify(body)
    })
    .then(fetchResponse => fetchResponse.json())
    .then(response => callback(null, response))
    .catch(error => {
      // Remote fetch failed add to indexedDB for offline use
      DBHelper.indexedDB().setReturnId(DBHelper.REVIEW_STORE, body)
      .then(reviewID => {
      // Add to PendingRequests IDB
        DBHelper.addRequestToPending(url, method, headers, body, reviewID)
        .then(() => DBHelper.processPending());
      })
      .catch(error => console.log(error));
      callback(error, null);
    });
  }

  static addRequestToPending(url, method, headers, body, reviewID = 0) {
    // Add request to Pending
    const request = {
      url: url,
      method: method,
      headers: headers,
      body: body,
      reviewID: reviewID
    }
    return DBHelper.indexedDB().set(DBHelper.PENDING_STORE, request)
    .then(complete => {
      // Add event listener to wait in background until user online
      window.addEventListener('online', (event) => {
        DBHelper.processPending();        
      });
      console.log(`Request added to ${DBHelper.PENDING_STORE}`);
      return;
    });
  }
  
  static processPending() {
    // TODO This function does too much processing - Refactor
    if (!navigator.onLine) {
      return;
    }
    const arrayOfPendingData = [];
    // Get a cursor of all pending requests
    DBHelper.indexedDB().openCursor(DBHelper.PENDING_STORE)
    // Loop through cursor and create data object
    .then(function nextPending(cursor) {
      if (!cursor) {
        console.log(`Done cursoring ${DBHelper.PENDING_STORE}`);
        return;
      }
      // append cursor to data object
      arrayOfPendingData.push(cursor.value);
      console.log(`Added ${cursor.value.body.name} to pendingData`);
      cursor.delete();
      console.log('Removed old record from pending indexedDB');
      // Process next cursor
      return cursor.continue().then(nextPending);
    })
    .then(() => {
      if (!arrayOfPendingData.length) {
        console.log('No data pending');
        return;
      }
      const arrayOfPromises = arrayOfPendingData.map(pendingObject => {
        // POST current pendingObject to remote DB
        return fetch(pendingObject.url, {
          method: pendingObject.method,
          headers: pendingObject.headers,
          body: JSON.stringify(pendingObject.body)
        })
        .then(fetchResponse => fetchResponse.json())
        .then(response => {
          console.log('Updated pending record on remote DB');
          // On success update existing indexedDB entry
          if (pendingObject.url.endsWith('reviews/')) {
            return DBHelper.indexedDB().set(DBHelper.REVIEW_STORE, response)
            .then(complete => {
              console.log('Placed updated review into indexedDB');
              return DBHelper.indexedDB().delete(DBHelper.REVIEW_STORE, pendingObject.reviewID)
              .then(complete => {
                console.log('Removed old record from review indexedDB');
                return 'Review Complete';
              });
            });
          } else { // restuarant primary key is in response so this will update existing record
            return DBHelper.indexedDB().set(DBHelper.RESTAURANT_STORE, response)
            .then(complete => {
              console.log('Update restaurant in indexedDB');
              return 'Restaurant Complete';
            });
          }
        }).catch(error => {
          // No response must be offline again
          return DBHelper.addRequestToPending(pendingObject.url, pendingObject.method, pendingObject.headers, pendingObject.body, pendingObject.reviewID)
          .then(() => {
            console.log(`Fetch request for pending ${pendingObject.body.name} failed. Added back to Pending`);
            return `${pendingObject.body.name} Pending Again`;
          });
        });
      });
      return Promise.all(arrayOfPromises);
    })
    .then(arrayOfPromises => {
      // Hack for index.html pending process
      if (location.pathname.startsWith('/restaurant')) {
        // TODO loop over arrayOfPromises to determine action
        DBHelper.indexedDB().getAll(DBHelper.REVIEW_STORE)
          .then(reviews => {
            createReviewsHTML(reviews);
            console.log('Updated review display');
          });
      }
    }).catch(error => {
      console.error(error);
      return;
    });  
  }

  /**
   * Helper Functions
   */

  static handleFetchErrors(fetchResponse) {
    if(!fetchResponse.ok) {
      console.log(fetchResponse.statusText);
    }
    return fetchResponse;
  }

}