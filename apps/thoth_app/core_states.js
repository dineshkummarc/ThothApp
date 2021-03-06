// ==========================================================================
// ThothApp.statechart
// ==========================================================================
/*globals ThothApp*/

/**
   @author Jeff Pittman
*/

ThothApp.statechart = SC.Statechart.create({

  rootState: SC.State.design({
    initialSubstate: "STARTING",
    //trace: YES,
    //substatesAreConcurrent: YES,

    // ----------------------------------------
    //    state: STARTING
    // ----------------------------------------
    STARTING: SC.State.design({

      enterState: function() {
        ThothApp.reviewsController.initializeForLoading();
        ThothApp.versionsController.initializeForLoading();
        ThothApp.booksController.initializeForLoading();
        ThothApp.authorsController.initializeForLoading();

        if (ThothApp.get('storeType') === 'Thoth') {
          this.gotoState('LOGIN');
        } else {                             // when using fixtures, go directly to LOADING_APP
          this.gotoState('LOADING_APP');
        }
      },

      exitState: function() {
      }
    }),

    // ----------------------------------------
    //    state: LOGIN
    // ----------------------------------------
    LOGIN: SC.State.design({
      initialSubstate: "SHOWING_LOGIN",

      // ----------------------------------------
      //    state: SHOWING_LOGIN
      // ----------------------------------------
      SHOWING_LOGIN: SC.State.design({

        enterState: function() {
          var panel = ThothApp.getPath('loginPanel');
          if (panel) {
            panel.append();
            panel.focus();
          }
        },

        exitState: function() {
          var panel = ThothApp.getPath('loginPanel');
          if (panel) {
            panel.remove();
          }
        },

        authenticate: function() {
          this.gotoState('AUTHENTICATING');
        }
      }),

      // ----------------------------------------
      //    state: AUTHENTICATING
      // ----------------------------------------
      AUTHENTICATING: SC.State.design({
        enterState: function() {
          // Call auth on the data source, which has callbacks to send events to the "authResult" functions here.
          return SC.Async.perform('logIn');
        },

        exitState: function() {
        },

        logIn: function() {
          var loginName = ThothApp.loginController.get('loginName');
          var password = ThothApp.loginController.get('password');

          ThothApp.store.dataSource.connect(ThothApp.store, function() {
            ThothApp.store.dataSource.authRequest(loginName, password);
          });
        },

        authFailure: function(errorMessage) {
          ThothApp.loginController.set('loginErrorMessage', errorMessage);
          this.resumeGotoState();
          this.gotoState('LOGIN');
        },

        authSuccess: function() {
          this.resumeGotoState();
          this.gotoState('AUTHENTICATED');
        }
      })
    }),

    // ----------------------------------------
    //    state: AUTHENTICATED
    // ----------------------------------------
    AUTHENTICATED: SC.State.design({
      enterState: function() {
        ThothApp.getPath('authenticatedPane').append();
      },

      exitState: function() {
        ThothApp.getPath('authenticatedPane').remove();
      },

      loadReviews: function() {
        this.gotoState('LOADING_REVIEWS');
      }
    }),

    // ----------------------------------------
    //    state: LOADING_REVIEWS
    // ----------------------------------------
    LOADING_REVIEWS: SC.State.design({
      _tmpRecordCount: 0,

      enterState: function() {
        return this.performAsync('loadReviews');
      },

      exitState: function() {
      },

      reviewsDidLoad: function() {
        this.resumeGotoState();
        this.gotoState('REVIEWS_LOADED');
      },

      // This is a closure. It will create an unnamed function checking for
      // completion of version records. The top-level generator function has version
      // as a passed-in argument, in scope for the generated function. The
      // 'var me = this;' line sets me, providing a reference to here (this state)
      // within the generated function. See use of _tmpRecordCount.
      generateCheckReviewsFunction: function(review) {
        var me = this;
        return function(val) {
          if (val & SC.Record.READY_CLEAN) {
            me._tmpRecordCount--;
            ThothApp.reviewsController.recordWasLoaded(review.get('fixturesKey'));
            if (me._tmpRecordCount === 0) {
              delete me._tmpRecordCount;

              this.reviewsDidLoad();
            }
            return YES;
          }
          else return NO;
        };
      },

      loadReviews: function() {
        var len =  ThothApp.Review.FIXTURES.get('length');
        this._tmpRecordCount = len;

        for (var i=0; i<len; i++) {
          var review;
          review = ThothApp.store.createRecord(ThothApp.Review, {
            "fixturesKey":  ThothApp.Review.FIXTURES[i].key,
            "text":         ThothApp.Review.FIXTURES[i].text
          });

          // this.generateCheckVersionsFunction is provided to create the function that
          // checks for READY_CLEAN for all reviews, before reporting reviewsDidLoad.
          review.addFiniteObserver('status', this, this.generateCheckReviewsFunction(review), this);
        }

        ThothApp.store.commitRecords();
      }

    }),

    // ----------------------------------------
    //    state: REVIEWS_LOADED
    // ----------------------------------------
    REVIEWS_LOADED: SC.State.design({
      enterState: function() {
        console.log('REVIEWS_LOADED');
        ThothApp.getPath('reviewsLoadedPane').append();
      },

      exitState: function() {
        ThothApp.getPath('reviewsLoadedPane').remove();
      },

      loadVersions: function() {
        this.gotoState('LOADING_VERSIONS');
      }
    }),

    // ----------------------------------------
    //    state: LOADING_VERSIONS
    // ----------------------------------------
    LOADING_VERSIONS: SC.State.design({
      _tmpRecordCount: 0,
      
      enterState: function() {
        return this.performAsync('loadVersions');
      },

      exitState: function() {
      },

      versionsDidLoad: function() {
        this.resumeGotoState();
        this.gotoState('VERSIONS_LOADED');
      },

      generateCheckVersionsFunction: function(version) {
        var me = this;
        return function(val) {
          if (val & SC.Record.READY_CLEAN) {
            me._tmpRecordCount--;
            ThothApp.versionsController.recordWasLoaded(version.get('fixturesKey'));
            if (me._tmpRecordCount === 0) {
              delete me._tmpRecordCount;

              var versionRecords = ThothApp.store.find(ThothApp.Version);
              versionRecords.forEach(function(versionRecord) {
                var fixturesKey = versionRecord.readAttribute('fixturesKey');

                var reviewRecords = ThothApp.store.find(SC.Query.local(ThothApp.Review, {
                  conditions: "fixturesKey ANY {id_fixtures_array}",
                  parameters: { id_fixtures_array: ThothApp.Version.FIXTURES[fixturesKey - 1].reviews  }
                }));

                versionRecord.get('reviews').pushObjects(reviewRecords);
              });

              ThothApp.store.commitRecords();

              this.versionsDidLoad();
            }
            return YES;
          }
          else return NO;
        };
      },

      loadVersions: function() {
        this._tmpRecordCount = ThothApp.Version.FIXTURES.get('length');

        for (var i = 0,len = ThothApp.Version.FIXTURES.get('length'); i < len; i++) {
          var fixturesKey = ThothApp.Version.FIXTURES[i].key;
          var version;
          version = ThothApp.store.createRecord(ThothApp.Version, {
            //"key":             fixturesKey,
            "fixturesKey":     fixturesKey,
            "publisher":       ThothApp.Version.FIXTURES[i].publisher,
            "publicationDate": ThothApp.Version.FIXTURES[i].publicationDate,
            "format":          ThothApp.Version.FIXTURES[i].format,
            "imgURL":          ThothApp.Version.FIXTURES[i].imgURL,
            "pages":           ThothApp.Version.FIXTURES[i].pages,
            "language":        ThothApp.Version.FIXTURES[i].language,
            "rank":            ThothApp.Version.FIXTURES[i].rank,
            "height":          ThothApp.Version.FIXTURES[i].height,
            "width":           ThothApp.Version.FIXTURES[i].width,
            "depth":           ThothApp.Version.FIXTURES[i].depth,
            "isbn10":          ThothApp.Version.FIXTURES[i].isbn10,
            "isbn13":          ThothApp.Version.FIXTURES[i].isbn13
          });

          version.addFiniteObserver('status', this, this.generateCheckVersionsFunction(version), this);
        }
        ThothApp.store.commitRecords();
      }

    }),

    // ----------------------------------------
    //    state: VERSIONS_LOADED
    // ----------------------------------------
    VERSIONS_LOADED: SC.State.design({
      initialSubstate: "PRESENTING_REPORT",

      PRESENTING_REPORT: SC.State.design({
        enterState: function() {
          console.log('VERSIONS_LOADED');
        var versions = ThothApp.store.find(SC.Query.local(ThothApp.Version));
        var reviews = ThothApp.store.find(SC.Query.local(ThothApp.Review));
        var recArrays = [{ recType: ThothApp.Version, recArray: versions},
          { recType: ThothApp.Review, recArray: reviews}];
           
        recArrays.forEach(function(item) {
          item.recArray.forEach(function(rec) {
            console.log(ThothApp.thothAppClassName(rec), ThothApp.store.storeKeyFor(item.recType, rec.get('id')), rec.get('id'), rec.get('status'));
          });
        });

          ThothApp.getPath('versionsLoadedPane').append();
        },

        exitState: function() {
          ThothApp.getPath('versionsLoadedPane').remove();
        },

        loadBooks: function() {
          this.gotoState('LOADING_BOOKS');
        }

      })
    }),

    // ----------------------------------------
    //    state: LOADING_BOOKS
    // ----------------------------------------
    LOADING_BOOKS: SC.State.design({
      _tmpRecordCount: 0,

      enterState: function() {
        return this.performAsync('loadBooks');
      },

      exitState: function() {
      },

      booksDidLoad: function() {
        this.resumeGotoState();
        this.gotoState('BOOKS_LOADED');
      },

      generateCheckBooksFunction: function(book){
        var me = this;
        return function(val){
          if (val & SC.Record.READY_CLEAN){
            me._tmpRecordCount--;
            ThothApp.booksController.recordWasLoaded(book.get('fixturesKey'));
            if (me._tmpRecordCount === 0){
              delete me._tmpRecordCount;

              var bookRecords = ThothApp.store.find(ThothApp.Book);
              bookRecords.forEach(function(bookRecord) {
                var fixturesKey = bookRecord.readAttribute('fixturesKey');

                var versionRecords = ThothApp.store.find(SC.Query.local(ThothApp.Version, {
                  conditions: "fixturesKey ANY {id_fixtures_array}",
                  parameters: {id_fixtures_array: ThothApp.Book.FIXTURES[fixturesKey-1].versions }}
                ));

                bookRecord.get('versions').pushObjects(versionRecords);
              });

              ThothApp.store.commitRecords();

              this.booksDidLoad();
            }
            return YES;
          }
          else return NO;
        };
      },

      loadBooks: function(){
        this._tmpRecordCount = ThothApp.Book.FIXTURES.get('length');

        for (var i=0,len=ThothApp.Book.FIXTURES.get('length'); i<len; i++){
          var book;
          book = ThothApp.store.createRecord(ThothApp.Book, {
            "fixturesKey": ThothApp.Book.FIXTURES[i].key,
            "title":       ThothApp.Book.FIXTURES[i].title
          });

          // The book record has been created, and its versions and the reviews of those versions.
          // Once the book records come back READY_CLEAN, create authors in the final step.
          book.addFiniteObserver('status',this,this.generateCheckBooksFunction(book),this);
        }
        ThothApp.store.commitRecords();
      }
    }),

    // ----------------------------------------
    //    state: BOOKS_LOADED
    // ----------------------------------------
    BOOKS_LOADED: SC.State.design({
      enterState: function() {
        console.log('BOOKS_LOADED');
        ThothApp.getPath('booksLoadedPane').append();
      },

      exitState: function() {
        ThothApp.getPath('booksLoadedPane').remove();
      },

      loadAuthors: function() {
        this.gotoState('LOADING_AUTHORS');
      }
    }),

    // ----------------------------------------
    //    state: LOADING_AUTHORS
    // ----------------------------------------
    LOADING_AUTHORS: SC.State.design({
      _tmpRecordCount: 0,

      enterState: function() {
        return this.performAsync('loadAuthors');
      },

      exitState: function() {
      },

      authorsDidLoad: function() {
        this.resumeGotoState();
        this.gotoState('AUTHORS_LOADED');
      },

      generateCheckAuthorsFunction: function(author){
        var me = this;
        return function(val){
          if (val & SC.Record.READY_CLEAN){
            me._tmpRecordCount--;
            ThothApp.authorsController.recordWasLoaded(author.get('fixturesKey'));
            if (me._tmpRecordCount === 0){
              delete me._tmpRecordCount;

              var authorRecords = ThothApp.store.find(ThothApp.Author);
              authorRecords.forEach(function(authorRecord) {
                var fixturesKey = authorRecord.readAttribute('fixturesKey');

                var bookRecords = ThothApp.store.find(SC.Query.local(ThothApp.Book, {
                  conditions: "fixturesKey ANY {id_fixtures_array}",
                  parameters: {id_fixtures_array: ThothApp.Author.FIXTURES[fixturesKey-1].books }}
                ));

                authorRecord.get('books').pushObjects(bookRecords);
              });

              ThothApp.store.commitRecords();

              this.authorsDidLoad();
            }
            return YES;
          }
          else return NO;
        };
      },

      loadAuthors: function(){
        this._tmpRecordCount = ThothApp.Author.FIXTURES.get('length');
        for (var i=0,len=ThothApp.Author.FIXTURES.get('length'); i<len; i++){
          var author;
          author = ThothApp.store.createRecord(ThothApp.Author, {
            //"key":         ThothApp.Author.FIXTURES[i].key,
            "fixturesKey": ThothApp.Author.FIXTURES[i].key,
            "firstName":   ThothApp.Author.FIXTURES[i].firstName,
            "lastName":    ThothApp.Author.FIXTURES[i].lastName
          });
          author.addFiniteObserver('status',this,this.generateCheckAuthorsFunction(author),this);
        }
        ThothApp.store.commitRecords();
      }

    }),

    // ----------------------------------------
    //    state: AUTHORS_LOADED (DATA_LOADED)
    // ----------------------------------------
    AUTHORS_LOADED: SC.State.design({
      enterState: function() {
        console.log('AUTHORS_LOADED');
        ThothApp.getPath('authorsLoadedPane').append();
      },

      exitState: function() {
        ThothApp.getPath('authorsLoadedPane').remove();
      },

      loadApp: function() {
        this.gotoState('LOADING_APP');
      }
    }),

    // ----------------------------------------
    //    state: LOADING_APP
    // ----------------------------------------
    LOADING_APP: SC.State.design({
      enterState: function() {
        console.log('LOADING_APP');

//        ThothApp.set('nestedStore', ThothApp.store.chain());
//
//        ThothApp.nestedStore.set('lockOnRead', YES);
//
//        var authors = ThothApp.nestedStore.find(SC.Query.local(ThothApp.Author));
//        var books = ThothApp.nestedStore.find(SC.Query.local(ThothApp.Book));
//        var versions = ThothApp.nestedStore.find(SC.Query.local(ThothApp.Version));
//        var reviews = ThothApp.nestedStore.find(SC.Query.local(ThothApp.Review));
        var authors = ThothApp.store.find(SC.Query.local(ThothApp.Author));
        var books = ThothApp.store.find(SC.Query.local(ThothApp.Book));
        var versions = ThothApp.store.find(SC.Query.local(ThothApp.Version));
        var reviews = ThothApp.store.find(SC.Query.local(ThothApp.Review));
        var recArrays = [{ recType: ThothApp.Author, recArray: authors},
                         { recType: ThothApp.Book, recArray: books},
                         { recType: ThothApp.Version, recArray: versions},
                         { recType: ThothApp.Review, recArray: reviews}];

        recArrays.forEach(function(item) {
          item.recArray.forEach(function(rec) {
            console.log(ThothApp.glClassName(rec), ThothApp.store.storeKeyFor(item.recType, rec.get('id')), rec.get('id'), rec.get('status'));
          });
        });

        ThothApp.authorsController.set('content', authors);

//        var all = [];
//        all.pushObjects(authors);
//        all.pushObjects(books);
//        all.pushObjects(versions);
//        all.pushObjects(reviews);
//
//        ThothApp.allItemsController.set('content', all);

        ThothApp.getPath('mainPage.mainPanel').append();

        this.invokeLater(function() {
          this.gotoState('APP_LOADED');
        });
      },

      exitState: function() {
      }
    }),

    // ----------------------------------------
    //    state: APP_LOADED
    // ----------------------------------------
    APP_LOADED: SC.State.design({
      initialSubstate: "SHOWING_STANDARD",

      enterState: function() {
        this.invokeLater(function() {
          console.log('versionController ', ThothApp.versionController.get('content'));
        });
      },

      exitState: function() {
      },

      // -------------------------------------------
      //    state: SHOWING_STANDARD
      // -------------------------------------------
      SHOWING_STANDARD: SC.State.design({
        initialSubstate: "READY_STANDARD",

        enterState: function() {
          console.log('SHOWING_STANDARD');
          ThothApp.authorController.set('show', 'standard');
        },

        exitState: function() {
        },

        showGraphic:    function() { this.gotoState('SHOWING_GRAPHIC'); },
        showImageUploadPane:  function() { this.gotoState('SHOWING_IMAGE_UPLOAD_PANE'); },

        // -------------------------------------------
        //    state: READY_STANDARD
        // -------------------------------------------
        READY_STANDARD: SC.State.design({
          enterState: function() {
            console.log('READY_STANDARD');
          },

          exitState: function() {
          },

          addAuthor:      function() { this.gotoState('ADDING_AUTHOR'); },
          addBook:        function() { this.gotoState('ADDING_BOOK'); },
          addVersion:     function() { this.gotoState('ADDING_VERSION'); },
          addReview:      function() { this.gotoState('ADDING_REVIEW'); },
          deleteAuthors:  function() { this.gotoState('DELETING_AUTHORS'); },
          deleteBook:     function() { this.gotoState('DELETING_BOOK'); },
          deleteVersion:  function() { this.gotoState('DELETING_VERSION'); },
          deleteReview:   function() { this.gotoState('DELETING_REVIEW'); }
        }),

        // ----------------------------------------
        //    state: ADDING_AUTHOR
        // ----------------------------------------
        ADDING_AUTHOR: SC.State.design({
          enterState: function() {
            var author;

            author = ThothApp.nestedStore.createRecord(ThothApp.Author, {
              "firstName":   "First",
              "lastName":    "Last"
            });

            ThothApp.nestedStore.commitRecords();

            // Once the author record comes back READY_CLEAN, start beginEditing in the list.
            author.addFiniteObserver('status', this, this.generateCheckAuthorFunction(author), this);
          },

          exitState: function() {
          },

          generateCheckAuthorFunction: function(authorRecord) {
            var me = this;
            return function(val) {
              if (val & SC.Record.READY_CLEAN) {
                me.invokeLater(function() {
                  var contentIndex = ThothApp.authorsController.indexOf(authorRecord);
                  var list = ThothApp.mainPage.getPath("mainPanel.splitter.topLeftView.authorList.contentView");
                  var listItem = list.itemViewForContentIndex(contentIndex);
                  listItem.beginEditing();
                });

                return YES;
              }
              else return NO;
            };
          }
        }),

        // ----------------------------------------
        //    state: ADDING_BOOK
        // ----------------------------------------
        ADDING_BOOK: SC.State.design({
          enterState: function() {
            var book;

            book = ThothApp.nestedStore.createRecord(ThothApp.Book, {
              "title": 'title'
            });

            ThothApp.nestedStore.commitRecords();

            // Once the book record comes back READY_CLEAN, add book to current author, and beginEditing in panel.
            book.addFiniteObserver('status', this, this.generateCheckBookFunction(book), this);
          },

          exitState: function() {
          },

          generateCheckBookFunction: function(book) {
            var me = this;
            return function(val) {
              if (val & SC.Record.READY_CLEAN) {
                ThothApp.authorsController.addBookToAuthor(book); // this will add book to the selected author

                me.selectObject(book);

                me.invokeLater(function() {
                  // Editing of a book title is not done in the book list, but in the panel on the right.
                  //
                  // Well, it looks here to think it is on the list. Must be a TODO...
                  //
                  ThothApp.bookController.beginEditing();
                });
              }
            };
          }
        }),

        // ----------------------------------------
        //    state: ADDING_VERSION
        // ----------------------------------------
        ADDING_VERSION: SC.State.design({
          enterState: function() {
            var version;

            version = ThothApp.nestedStore.createRecord(ThothApp.Version, {
              "publisher":       '',
              "publicationDate": '',
              "format":          '',
              "pages":           0,
              "language":        '',
              "rank":            0,
              "height":          0,
              "width":           0,
              "depth":           0,
              "isbn10":          '',
              "isbn13":          ''
            });

            ThothApp.nestedStore.commitRecords();

            // Once the version record comes back READY_CLEAN, add version to current book, and beginEditing.
            version.addFiniteObserver('status', this, this.generateCheckVersionFunction(version), this);
          },

          exitState: function() {
          },

          generateCheckVersionFunction: function(version) {
            var me = this;
            return function(val) {
              if (val & SC.Record.READY_CLEAN) {
                ThothApp.booksController.addVersionToBook(version);  // adds version to selected book

                ThothApp.versionsController.selectObject(version);

                me.invokeLater(function() {
                  ThothApp.versionController.beginEditing();
                });
              }
            };
          }
        }),

        // ----------------------------------------
        //    state: ADDING_REVIEW
        // ----------------------------------------
        ADDING_REVIEW: SC.State.design({
          enterState: function() {
            var review;

            review = ThothApp.nestedStore.createRecord(ThothApp.Review, {
              "text": "Say what you think."
            });

            ThothApp.nestedStore.commitRecords();

            // Once the review record comes back READY_CLEAN, add review to current version, and beginEditing.
            review.addFiniteObserver('status', this, this.generateCheckReviewFunction(review), this);
          },

          exitState: function() {
          },

          generateCheckReviewFunction: function(review) {
            var me = this;
            return function(val) {
              if (val & SC.Record.READY_CLEAN) {
                ThothApp.versionsController.addReviewToVersion(review); // adds review to current version

                ThothApp.reviewsController.selectObject(review);

                me.invokeLater(function() {
                  ThothApp.versionController.beginEditing();
                });
              }
            };
          }
        }),

        // ----------------------------------------
        //    state: DELETING_AUTHORS
        // ----------------------------------------
        DELETING_AUTHORS: SC.State.design({
          enterState: function() {
            SC.AlertPane.warn(
                    "Be Careful!",
                    "Are you sure you want to delete the selected authors?",
                    null,
                    "Keep Authors",
                    "Delete Authors",
                    null,
                    this
                    );
          },

          exitState: function() {
          },

          deleteAuthors: function() {
            // do the delete
          },

          alertPaneDidDismiss: function(pane, status) {
            switch (status) {
              case SC.BUTTON2_STATUS:
                this.deleteAuthors();
                break;
              case SC.BUTTON1_STATUS:
                break;
            }
          }
        }),

        // ----------------------------------------
        //    state: DELETING_BOOK
        // ----------------------------------------
        DELETING_BOOK: SC.State.design({
          enterState: function() {
            SC.AlertPane.warn(
                    "Be Careful!",
                    "Are you sure you want to delete the selected books?",
                    null,
                    "Keep Books",
                    "Delete Books",
                    null,
                    this
                    );
          },

          exitState: function() {
          },

          deleteBooks: function() {
            // do the delete
          },

          alertPaneDidDismiss: function(pane, status) {
            switch (status) {
              case SC.BUTTON2_STATUS:
                this.deleteBooks();
                break;
              case SC.BUTTON1_STATUS:
                break;
            }
          }
        }),

        // ----------------------------------------
        //    state: DELETING_VERSION
        // ----------------------------------------
        DELETING_VERSION: SC.State.design({
          enterState: function() {
            SC.AlertPane.warn(
                    "Be Careful!",
                    "Are you sure you want to delete the selected book versions?",
                    null,
                    "Keep Versions",
                    "Delete Versions",
                    null,
                    this
                    );
          },

          exitState: function() {
          },

          deleteVersions: function() {
            // do the delete
          },

          alertPaneDidDismiss: function(pane, status) {
            switch (status) {
              case SC.BUTTON2_STATUS:
                this.deleteVersions();
                break;
              case SC.BUTTON1_STATUS:
                break;
            }
          }
        }),

        // ----------------------------------------
        //    state: DELETING_REVIEW
        // ----------------------------------------
        DELETING_REVIEW: SC.State.design({
          enterState: function() {
            SC.AlertPane.warn(
                    "Be Careful!",
                    "Are you sure you want to delete the selected book reviews?",
                    null,
                    "Keep Reviews",
                    "Delete Reviews",
                    null,
                    this
                    );
          },

          exitState: function() {
          },

          deleteReviews: function() {
            // do the delete
          },

          alertPaneDidDismiss: function(pane, status) {
            switch (status) {
              case SC.BUTTON2_STATUS:
                this.deleteReviews();
                break;
              case SC.BUTTON1_STATUS:
                break;
            }
          }
        })
      }),

      // -------------------------------------------
      //    state: SHOWING_IMAGE_UPLOAD_PANE
      // -------------------------------------------
      SHOWING_IMAGE_UPLOAD_PANE: SC.State.design({
        enterState: function() {
          console.log('SHOWING_IMAGE_UPLOAD_PANE');

          var panel = ThothApp.getPath('imageUploadPane');
          if (panel) {
            panel.append();
          }
        },

        exitState: function() {
          var panel = ThothApp.getPath('imageUploadPane');
          if (panel) {
            panel.remove();
          }
        },

        cancel: function() {
          this.gotoState('SHOWING_STANDARD');
        },

        save: function() {
          // [TODO maybe make Async and use callback to goto next state]
          var storeKey = ThothApp.store.storeKeyFor(ThothApp.Version, ThothApp.versionController.get('id'));

          ThothApp.store.dataSource.uploadRequest(
                  'prepareForUpload',
                  { userData: { username: 'test', password: 'test'},
                    opRequests: { resize: { small: { w: 32, h: 32 },
                                            medium: { w: 128, h: 128 },
                                            large: { w: 256, h: 256 }}},
                    associated: [{ bucket: 'Version', key: storeKey, property: 'imgURL' }]},
                  function(data) {
                    ThothApp.getPath('imageUploadPane.contentView.imageUpload').set('requestPrototype', SC.Request.create());
                    ThothApp.getPath('imageUploadPane.contentView.imageUpload').set('uploadTarget', '/thoth' + data.uploadURL);
                    ThothApp.getPath('imageUploadPane.contentView.imageUpload').startUpload();
                  }
          );
          this.gotoState('SHOWING_STANDARD');
        }
      }),

      // -------------------------------------------
      //    state: SHOWING_GRAPHIC
      // -------------------------------------------
      SHOWING_GRAPHIC: SC.State.design({
        enterState: function() {
          console.log('SHOWING_GRAPHIC');

          ThothApp.set('nestedStore', ThothApp.store.chain());

          ThothApp.nestedStore.set('lockOnRead', YES);

          var authors = ThothApp.nestedStore.find(SC.Query.local(ThothApp.Author));
          var books = ThothApp.nestedStore.find(SC.Query.local(ThothApp.Book));
          var versions = ThothApp.nestedStore.find(SC.Query.local(ThothApp.Version));
          var reviews = ThothApp.nestedStore.find(SC.Query.local(ThothApp.Review));

          var all = [];
          all.pushObjects(authors);
          all.pushObjects(books);
          all.pushObjects(versions);
          all.pushObjects(reviews);

          ThothApp.allItemsController.set('content', all);

          this.setLinkItPositions(authors);

          console.log('all[20] x ', all[20].get('position')['x']);
          console.log('all[20] y ', all[20].get('position')['y']);

          ThothApp.authorController.set('show', 'graphic');
        },

        exitState: function() {
        },

        setLinkItPositions: function(authors) {
          var yAuthor = 100, authorHeight, bookHeight, versionHeight, yReview = 0, firstChild;

          //
          // Set review positions
          //
          authors.forEach(function(author) {
            authorHeight = author.get('depthOfChildren') * 50;
            author.get('books').forEach(function(book) {
              book.get('versions').forEach(function(version) {
                version.get('reviews').forEach(function(review) {
                  if (yReview === 0) {
                    yReview = yAuthor;
                  } else {
                    yReview = yReview + 50;
                  }
                  review.set('position', { x: 700, y: yReview});
                });
              });
            });
            yAuthor += authorHeight;
          });
          //
          // Set version positions
          //
          authors.forEach(function(author) {
            author.get('books').forEach(function(book) {
              book.get('versions').forEach(function(version) {
                firstChild = version.get('reviews').objectAt(0);
                versionHeight = (version.get('depthOfChildren')-1) * 50;
                version.set('position', { x: 500, y: firstChild.get('position')['y'] + (versionHeight / 2) });
              });
            });
          });
          //
          // Set book positions
          //
          authors.forEach(function(author) {
            author.get('books').forEach(function(book) {
              firstChild = book.get('versions').objectAt(0);
              bookHeight = (book.get('depthOfChildren')-1) * 50;
              console.log(book);
              console.log(firstChild);
              console.log(bookHeight);
              book.set('position', { x: 300, y: firstChild.get('position')['y'] + (bookHeight / 2) });
            });
          });
          //
          // Set author positions
          //
          authors.forEach(function(author) {
            firstChild = author.get('books').objectAt(0);
            authorHeight = (author.get('depthOfChildren')-1) * 50;
            author.set('position', { x: 100, y: firstChild.get('position')['y'] + (authorHeight / 2) });
          });
        },

        showStandard: function() { this.gotoState('SHOWING_STANDARD'); }
      })
    })
  })
});

