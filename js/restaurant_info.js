let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1Ijoic21hdXN0aW4iLCJhIjoiY2ppYzB0aml3MDg2NjNxcjNqbnAwOGdlMCJ9.zPZU77ZFPv5E1fC6ows37g',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}  
 
/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  // image srcset based on Doug Brown example 
  const imageURL = DBHelper.imageUrlForRestaurant(restaurant, 'banners');
  const imageURL1x = (imageURL.endsWith('empty-plate.jpg')) ? imageURL : imageURL.replace('.jpg', '_1x.jpg');
  const imageURL2x = (imageURL.endsWith('empty-plate.jpg')) ? imageURL : imageURL.replace('.jpg', '_2x.jpg');
  image.src = imageURL1x;
  image.srcset = `${imageURL1x} 400w, ${imageURL2x} 900w`;
  image.alt = `${restaurant.name} promotional image`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  DBHelper.fetchReviewsByRestaurant(restaurant, (error, reviews) => {
    self.reviews = reviews;
    if (error) {
      console.error(error);
    }
    fillReviewsHTML();
  });
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.reviews) => {
  const container = document.getElementById('reviews-container');
  const formContainer = document.getElementById('review-form-container');
  const reviewForm = document.getElementById('review-form');
  // TODO: add listener on form elements to enable/disable submit
  reviewForm.addEventListener('submit', processReviewForm, false);
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.insertBefore(title, formContainer);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  
  container.appendChild(createReviewsHTML());
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewsHTML = (reviews = self.reviews) => {
  const ul = document.getElementById('reviews-list');
  ul.innerHTML = '';
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });

  return ul;
}

createReviewHTML = (review) => {
  const li = document.createElement('li');

  if (!review.id) { //check for review id assigned by remote DB
    const offlineNotice = document.createElement('p');
    offlineNotice.className = 'review-offline';
    offlineNotice.innerHTML = '<strong>OFFLINE</strong>';
    li.appendChild(offlineNotice);
  }

  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  const lastUpdated = (review.updatedAt > review.createdAt) ? review.updatedAt : review.createdAt;
  date.innerHTML = lastUpdated ? new Date(lastUpdated).toLocaleDateString() : 'Pending';
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.setAttribute('aria-current', 'page');
  a.href = DBHelper.urlForRestaurant(restaurant);
  a.innerHTML = restaurant.name;
  li.append(a);

  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

processReviewForm = (event) => {
  event.preventDefault();
  const form = event.target;

  const restaurant_id = self.restaurant.id;
  const name = document.getElementById('reviewerName').value;
  const rating = document.getElementById('selectRating').value;
  const comment_text = document.getElementById('reviewComment').value;

  // TODO Form validation

  DBHelper.addRestaurantReview(restaurant_id, name, rating, comment_text, (error, review) => {
      if (error) {
        console.error(error);
      } else {
        // POST to remote DB worked so add review to indexedDB
        DBHelper.indexedDB().set(DBHelper.REVIEW_STORE, review);
      }
      // Reset form and refresh review display
      form.reset();
      DBHelper.indexedDB().getAllIdx(DBHelper.REVIEW_STORE, 'restaurant_id', restaurant_id)
        .then(reviewsCache => {
          self.reviews = reviewsCache;
          createReviewsHTML();
      });
  });
}