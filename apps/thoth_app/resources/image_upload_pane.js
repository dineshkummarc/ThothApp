// ==========================================================================
// ThothApp.authorsLoadedPane
// ==========================================================================
/*globals ThothApp*/

/**

   @author Jeff Pittman
*/


ThothApp.imageUploadPane = SC.PanelPane.design({
  layout: { centerX: 0, top: 80, width: 420, height: 150},
  classNames: ['product'],
  defaultResponder: ThothApp.statechart,

  contentView: SC.View.design({
    layout: { left: 0, right: 0, top: 0, bottom: 0 },
    childViews: 'title imageUpload cancelButton saveButton'.w(),

    title: SC.LabelView.design({
      layout: { left: 20, top: 10, right: 20, height: 24 },
      classNames: ['product-title'],
      value: 'Add a Product (Select category first.)',
      controlSize: SC.LARGE_CONTROL_SIZE,
      fontWeight: SC.BOLD_WEIGHT
    }),

    imageUpload: EcBasic.UploadView.design({
      layout: { left: 17, right: 14, top: 50, height: 36 }
    }),

    cancelButton: SC.ButtonView.design({
      layout: { right: 120, bottom: 10, width: 100, height: 24 },
      title: 'Cancel',
      action: 'cancel'
    }),

    saveButton: SC.ButtonView.design({
      layout: { right: 10, bottom: 10, width: 100, height: 24 },
      title: 'Save',
      action: 'save',
      isDefault: YES
    })
  })
});