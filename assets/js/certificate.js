(function (window) {
    "use strict";

    function getAlumniRecord(user) {
        if (!user || !window.KWUST) {
            return null;
        }

        return window.KWUST.getState().alumni.filter(function (alumnus) {
            return alumnus.id === user.identifier;
        })[0] || null;
    }

    function getCertificateRecord() {
        var user = window.KWUST ? window.KWUST.getCurrentUser() : null;

        if (!user) {
            return null;
        }

        if (user.role === "student") {
            return window.KWUST.getCurrentStudent();
        }

        if (user.role === "alumni") {
            return getAlumniRecord(user);
        }

        return null;
    }

    function renderCertificate() {
        var record = getCertificateRecord();

        if (!record) {
            var printButton = document.getElementById("certificatePrintButton");

            if (printButton) {
                printButton.disabled = true;
                printButton.setAttribute("aria-disabled", "true");
            }

            return;
        }

        var user = window.KWUST.getCurrentUser();
        var student = user.role === "student" ? window.KWUST.getCurrentStudent() : null;
        var progress = student ? window.KWUST.getProgress(student) : 100;
        var nameElement = document.getElementById("certificateName");
        var descriptionElement = document.getElementById("certificateDescription");
        var numberElement = document.getElementById("certificateNumber");
        var statusElement = document.getElementById("certificateStatus");
        var noteElement = document.getElementById("certificateNote");
        printButton = document.getElementById("certificatePrintButton");

        if (printButton) {
            printButton.disabled = progress !== 100;
            printButton.setAttribute("aria-disabled", String(progress !== 100));
        }

        if (nameElement) {
            nameElement.textContent = record.name;
        }

        if (descriptionElement) {
            descriptionElement.textContent = "for successfully completing the required academic and administrative clearance records for the award of the degree of " + record.degree + ".";
        }

        if (numberElement) {
            numberElement.textContent = "KIRIRI-" + String(record.degree || "CLEARANCE").replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() + "-" + record.graduationYear + "-" + record.id.slice(-4);
        }

        if (statusElement) {
            statusElement.textContent = progress === 100 ? "Clearance complete" : progress + "% complete — preview only";
            statusElement.className = progress === 100 ? "status-cleared" : "status-pending";
        }

        if (noteElement) {
            noteElement.textContent = progress === 100
                ? "This certificate preview is available because every mandatory department has been cleared."
                : "This is a preview. The final certificate becomes available after all four mandatory departments are approved.";
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        var printButton = document.getElementById("certificatePrintButton");

        renderCertificate();
        window.addEventListener("kwust:state-changed", renderCertificate);

        if (printButton) {
            printButton.addEventListener("click", function () {
                var user = window.KWUST.getCurrentUser();
                var record = getCertificateRecord();
                var student = user && user.role === "student" ? window.KWUST.getCurrentStudent() : null;
                var progress = student ? window.KWUST.getProgress(student) : 100;

                if (!record || progress !== 100) {
                    var noteElement = document.getElementById("certificateNote");

                    if (noteElement) {
                        noteElement.textContent = "Printing is available after all four mandatory departments approve the record.";
                    }

                    return;
                }

                window.print();
            });
        }
    });

    window.KWUSTCertificate = {
        render: renderCertificate
    };
}(window));
