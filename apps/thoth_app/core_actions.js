/**
 *
 * Created by IntelliJ IDEA.
 * User: geojeff
 * Date: Oct 29, 2010
 * Time: 9:19:08 AM
 * To change this template use File | Settings | File Templates.
 */

sc_require('controllers/reviews');
sc_require('controllers/versions');
sc_require('controllers/books');
sc_require('controllers/authors');

ThothApp.mixin({
  loadedReviews: [],
  loadedVersions: [],
  loadedBooks: [],
  loadedAuthors: [],

  loadedAuthorCount:  0,
  loadedBookCount:    0,
  loadedVersionCount: 0,
  loadedReviewCount:  0,

  bumpAuthorCount: function(key) {
    this.get('loadedAuthors').push(key);
    var count = this.get('loadedAuthorCount');
    count++;
    this.set('loadedAuthorCount', count);
    console.log(count);
  },

  bumpBookCount: function(key) {
    this.get('loadedBooks').push(key);
    var count = this.get('loadedBookCount');
    count++;
    this.set('loadedBookCount', count);
    console.log(count);
  },

  bumpVersionCount: function(key) {
    this.get('loadedVersions').push(key);
    var count = this.get('loadedVersionCount');
    count++;
    this.set('loadedVersionCount', count);
    console.log(count);
  },

  bumpReviewCount: function(key) {
    this.get('loadedReviews').push(key);
    var count = this.get('loadedReviewCount');
    count++;
    this.set('loadedReviewCount', count);
    console.log(count);
  }

});