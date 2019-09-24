sap.ui.define(["sap/ui/core/ValueState"], function (State) {
    "use strict";

    return {

        statusState(sValue) {

            switch (sValue) {
                case "E0040":
                case "E0041":
                case "E0045":
                case "E0047":
                case "E0050":
                    return State.Warning;
                case "E0001":
                    return State.Information;
                case "E0049":
                    return State.Success;
                case "E0035":
                case "E0044":
                case "E0052":
                    return State.Error;
                default:
                    return State.None;
            }
        }
    };
});
