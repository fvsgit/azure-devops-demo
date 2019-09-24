sap.ui.define(["dbag/zep/lib/component/BaseUIComponent"],
function (BaseUIComponent) {
  "use strict";

  return BaseUIComponent.extend("crm.exas.uidm.apploverview.Component", {

    metadata: {
      manifest: "json"
    },

    init() {

      // call the base component's init function and create the App view
      BaseUIComponent.prototype.init.apply(this, arguments);

      // create the views based on the url/hash
      this.getRouter().initialize();
    }
  });
});
