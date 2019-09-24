sap.ui.define(['dbag/zep/lib/controller/BaseController',
                'sap/ui/model/json/JSONModel',
                'sap/ui/model/Sorter',
                'sap/ui/model/Filter',
                'sap/ui/model/FilterOperator',
                "sap/ui/core/Fragment",
                // "sap/m/MessageBox",
                'crm/exas/uidm/apploverview/model/formatter'
], function (BaseController, JSONModel, Sorter, Filter, Operator, Fragment, /* MessageBox, */ formatter) {
    "use strict";

    return BaseController.extend('crm.exas.uidm.apploverview.controller.Main', {

        formatter: formatter,
        
        /** ----------------------------------------------------------------------------------------------------------------------------------
         * LIFECYCLE METHODS
        ----------------------------------------------------------------------------------------------------------------------------------- */

        /**
         * lifecycle hook for route matched event
         * @param {Object} fired event object by the control
         */
        _onRouteHit(oEvent) {

            // handle initial load
            Promise.all([this.getOwnerComponent().onMyProfileInfoLoaded(),  this.getModel().metadataLoaded()]).then(() => {
                this.getView().byId("idResultTable").bindAggregation("items", {
                    path : '/UserIDRequests',
                    template: new sap.m.ColumnListItem({
                        cells: [
                            new sap.m.ObjectIdentifier({ title: '{Objectid}' }),
                            new sap.m.Text({ text: '{OwnerName}' }),
                            new sap.m.Text({ text: '{SubProcTypeTxt}' }),
                            new sap.m.ObjectStatus({ text: '{StatusTxt}' }),
                            new sap.m.Text({ text: '{MemberId}' }),
                            new sap.m.Text({ text: "{ path: 'CreatedAt', type: 'sap.ui.model.type.Date', formatOptions: { style: 'medium' } }" })
                        ]
                    }),
                    templateShareable: true,
                    filters: [new Filter('CompanyPartner', Operator.EQ, this.getModel("profile").getProperty("/OrganisationID"))],
                    sorter: new Sorter('CreatedAt', true)
                });
            })
        },

        /**
         * lifecycle method for onInit
         */ 
        onInit() {

            // register route matched event
            this.getRouter().getRoute("main").attachPatternMatched(this._onRouteHit, this);

            // set profile information model and load member IDs
            this.getOwnerComponent().onMyProfileInfoLoaded().then(oMyProfile => this.setModel(new JSONModel(oMyProfile), "profile"));

            // initialize internal mapping object that holds loaded view settings dialogs
            this._mViewSettingsDialogs = {};

            // initialize internal array to hold current filters
            this._aCurrentFilter = [];

            // set local model to hold count data
            this.setModel(new JSONModel({
                countAll            : 0,
                countDraft          : 0,
                countInProgress     : 0,
                countCompleted      : 0,
				displayButtonEnabled: false,
				printButtonEnabled  : false
            }), "view");
        },
        
        /** ----------------------------------------------------------------------------------------------------------------------------------
         * EVENT HANDLERS
        ----------------------------------------------------------------------------------------------------------------------------------- */

        /**
         * event handler for icon tab bar selection change
         * updates result table binding according to the selected icon tab filter
         * @param {Object} fired event object by the control
         */
        onQuickFilter(oEvent) {

            // update internal filter array
            this._aCurrentFilter = this._aCurrentFilter.filter(f => f.sPath !== "ExternalStatusGrp");

            if (oEvent.getParameter("selectedKey") !== "all")
                this._aCurrentFilter.push(new Filter("ExternalStatusGrp", Operator.EQ, oEvent.getParameter("selectedKey")));

            // filter result table binding
            this.byId("idResultTable").getBinding("items").filter(this._aCurrentFilter);
        },

        /**
         * event handler for sort and filter buttons
         * opens corresponding view settings dialog
         * @param {string} name of the fragment to be opened
         */
        onPressActionButton(sFragmentName) {

            // check if requested dialog already exists
            const oDialog = this._mViewSettingsDialogs[sFragmentName];

            // lazy load and open the requested dialog
            if (!oDialog) {
                Fragment.load({ name: "crm.exas.uidm.apploverview.fragments." + sFragmentName, controller: this, id: this.getView().getId() }).then(oDialog => {
                    this._mViewSettingsDialogs[sFragmentName] = oDialog;
                    this.getView().addDependent(oDialog);
                    oDialog.open();
                });
            } else {
                oDialog.open();
            }
        },

        /**
         * event handler for confirm event of sort dialog
         * @param {Object} fired event object by the control
         */
        onConfirmSort(oEvent) {

            // get event parameters
            const mParams = oEvent.getParameters();

            // execute sort
            this.byId("idResultTable").getBinding("items").sort([new Sorter(mParams.sortItem.getKey(), mParams.sortDescending)]);
        },

        /**
         * event handler for confirm event of filter dialog
         */
        onConfirmFilter() {

            // get values of filter items
            const sObjectId = this.byId("idFilterItemReferenceId").getValue();
            const sName = this.byId("idFilterItemName").getValue();
            const oDate = this.byId("idFilterItemCreatedAt").getDateValue();

            // set filters
            this._aCurrentFilter = this._aCurrentFilter.filter(f => f.sPath !== "Objectid" && f.sPath !== "OwnerName" && f.sPath !== "CreatedAt");

            if (sObjectId) {
                this._aCurrentFilter.push(new Filter("Objectid", Operator.EQ, sObjectId));
            }

            if (sName) {
                this._aCurrentFilter.push(new Filter("OwnerName", Operator.Contains, sName));
            }

            if (oDate) {
                const oDateStart = new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate(), 0, 0, 0);
                const oDateEnd   = new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate(), 23, 59, 59);
                this._aCurrentFilter.push(new Filter("CreatedAt", Operator.BT, oDateStart, oDateEnd));
            }

             // filter result table binding
            this.byId("idResultTable").getBinding("items").filter(this._aCurrentFilter);
        },

        /**
         * event handler to reset filters
         */
        onResetFilters() {
            this.byId("idFilterItemReferenceId").setValue("");
            this.byId("idFilterItemName").setValue("");
            this.byId("idFilterItemCreatedAt").setDateValue(null);
        },

        /**
         * event handler for update finished event of the result table
         * updates count properties on local model once update is finished
         */
        onUpdateFinished() {

            this.getModel().read("/UserIDRequests/$count", {
                filters: [new Filter('CompanyPartner', Operator.EQ, this.getModel("profile").getProperty("/OrganisationID"))],
                success: sCount => this.getModel("view").setProperty("/countAll", sCount)
            });

            this.getModel().read("/UserIDRequests/$count", {
                filters: [
                    new Filter("ExternalStatusGrp", Operator.EQ, "2"),
                    new Filter('CompanyPartner', Operator.EQ, this.getModel("profile").getProperty("/OrganisationID"))
                ],
                success: sCount => this.getModel("view").setProperty("/countInProgress", sCount)
            });

            this.getModel().read("/UserIDRequests/$count", {
                filters: [
                    new Filter("ExternalStatusGrp", Operator.EQ, "3"),
                    new Filter('CompanyPartner', Operator.EQ, this.getModel("profile").getProperty("/OrganisationID"))
                ],
                success: sCount => this.getModel("view").setProperty("/countCompleted", sCount)
            });
        },

        /**
         * event handler for print button press
         * downloads PDF
         */
		onPressPrint() {

            // generate odata path
			const sPath = this.byId("idResultTable").getSelectedItem().getBindingContext().getPath();
			const sServiceURI = this.getOwnerComponent().getManifestEntry("/sap.app/dataSources/exas/uri");
    
            // download
			sap.m.URLHelper.redirect(`${sServiceURI}${sPath}/PrintForm/$value`, true );
        },
        
        /**
         * event handler for print button press
         * navigates to corresponding application
         */
        onPressDisplay() {

            const oContext = this.byId("idResultTable").getSelectedItem().getBindingContext().getObject();

			this.navToApp(this._getNavProperty(oContext.SubProcType), {
                route: 'display',
                routerParameters: { "Guid": oContext.Guid }
            });
        },

        /**
         * event handler for selection change of result table
         * handles state of display and print buttons on the footer
         * @param {Object} fired event object by the control
         */
		onTableSelectionChange(oEvent) {

			this.getModel("view").setProperty("/displayButtonEnabled", oEvent.getSource().getSelectedItem() ? true : false);
			this.getModel("view").setProperty("/printButtonEnabled", oEvent.getSource().getSelectedItem() ? true : false);
		},
        
        /** ----------------------------------------------------------------------------------------------------------------------------------
         * INTERNAL METHODS
        ----------------------------------------------------------------------------------------------------------------------------------- */

        /**
         * internal method to determine navigation quicklink
         * @param {string} sub process type of the selected application
         */
        _getNavProperty(sSubProcType) {

            switch (sSubProcType) {
                case '3':   // Add User ID
                    return 'uidmadduserid';
                case '4':   // Change Owner of User ID
                    return 'uidmchangeowner';
                case '5':   // Change Phone Number
                    return 'uidmchangephone';
                case '6':   // Change Function
                    return 'uidmchangefunction';
                case '7':   // Change Deputy
                    return 'uidmchangedeputy';
                case '8':   // Delete User ID
                    return 'uidmdeleteuserid';
                default:
                    return null;
            }
        }

    });
});