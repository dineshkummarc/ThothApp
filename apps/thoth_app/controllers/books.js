// ==========================================================================                                                                                                                                                                                            
// ThothApp.booksController
// ==========================================================================
/*globals ThothApp*/

/** 

This controller manages book data.

   @extends SC.ArrayController
   @author Jeff Pittman
*/

sc_require('fixtures/book');

ThothApp.booksController = SC.ArrayController.create(
/** @scope ThothApp.booksController.prototype */ {

  contentBinding: "ThothApp.authorController.books",
  allowsEmptySelection: NO,
  canAddContent: YES,
  canReorderContent: NO,
  canRemoveContent: YES,
  isEditable: YES,

  isLoadedArray: [],
  loadedCount: 0,

  // deleting books is handled by booksController.

  // removing books from authors is handled by the authorController.

  initializeForLoading: function() {
    var arr = this.get('isLoadedArray');
    for (var i=0,len=ThothApp.Book.FIXTURES.get('length'); i<len; i++) {
      arr.pushObject(NO);
    }
  },

  recordWasLoaded: function(key) {
    this.get('isLoadedArray').replace(key-1, 1, [YES]);
    var count = this.get('loadedCount');
    this.set('loadedCount', count+1);
  },

  collectionViewDeleteContent: function(view, content, indexes) {
    // get records first for safety :)
    var records = indexes.map(function(idx) {
      return this.objectAt(idx);
    }, this);

    // process OUR WAY!
    this._pendingOperation = { action: "deleteBooks", records: records, indexes: indexes  };

    // calculate text
    var text = "";
    var name = "Book";
    var len = indexes.get("length");
    if (len > 1) {
      name += "s";
      text = "Are you sure you want to delete these " + len + " books?";
    } else {
      text = "Are you sure you want to delete this book?";
    }

    // show warning
    SC.AlertPane.warn(
      "Be Careful!",
      text,
      null,
      "Keep " + name,
      "Delete " + name,
      null,
      this
    );
  },

  deleteBooks: function(op) {
    var records = op.records, indexes = op.indexes;
    records.invoke('destroy');

    var selIndex = indexes.get('min') - 1;
    if (selIndex < 0) selIndex = 0;
    this.selectObject(this.objectAt(selIndex));

    ThothApp.store.commitRecords();
  },

  alertPaneDidDismiss: function(pane, status) {
    if (!this._pendingOperation) return;
    switch (status) {
      case SC.BUTTON2_STATUS:
        this[this._pendingOperation.action].call(this, this._pendingOperation);
        this._pendingOperation = null;
        break;
      case SC.BUTTON1_STATUS:
        break;
    }
  },

  addNewVersion: function(version) {
    var sel = this.get("selection");
    if (!sel) return;
    version.set("book", sel.firstObject());
    sel.firstObject().get('versions').pushObject(version);
  }

});

