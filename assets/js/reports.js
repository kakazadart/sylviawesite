/* Clearance report export and print actions */
(function (window) {
    "use strict";

    function escapeCsv(value) {
        var text = String(value || "");

        if (/^[=+\-@]/.test(text)) {
            text = "'" + text;
        }

        return '"' + text.replace(/"/g, '""') + '"';
    }

    function getReportRows() {
        if (!window.KWUST) {
            return [];
        }

        var user = window.KWUST.getCurrentUser();
        var department = user && user.role === "department" && window.KWUST.getDepartment(user.department) ? user.department : "";

        return window.KWUST.getReportStudents(user).map(function (student) {
            var progress = department ? student.checklist[department].status === "cleared" ? 100 : 0 : window.KWUST.getProgress(student);
            var checklist = student.checklist;
            return {
                registration: student.id,
                name: student.name,
                programme: student.degree,
                graduationYear: student.graduationYear,
                progress: progress,
                library: department ? department === "library" ? checklist.library.status : "Not in scope" : checklist.library.status,
                finance: department ? department === "finance" ? checklist.finance.status : "Not in scope" : checklist.finance.status,
                departmentHead: department ? department === "departmentHead" ? checklist.departmentHead.status : "Not in scope" : checklist.departmentHead.status,
                hostels: department ? department === "hostels" ? checklist.hostels.status : "Not in scope" : checklist.hostels.status,
                status: department ? student.checklist[department].status : student.status
            };
        });
    }

    function downloadCsv() {
        var rows = getReportRows();
        var header = ["Registration", "Name", "Programme", "Graduation year", "Progress", "Library", "Finance", "Department Head", "Hostels", "Account status"];
        var lines = [header.map(escapeCsv).join(",")];

        rows.forEach(function (row) {
            lines.push([
                row.registration,
                row.name,
                row.programme,
                row.graduationYear,
                row.progress + "%",
                row.library,
                row.finance,
                row.departmentHead,
                row.hostels,
                row.status
            ].map(escapeCsv).join(","));
        });

        var blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = url;
        link.download = "kwust-clearance-report.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 0);
    }

    function printReport() {
        window.print();
    }

    document.addEventListener("DOMContentLoaded", function () {
        document.querySelectorAll("[data-download-report]").forEach(function (button) {
            button.addEventListener("click", function () {
                var format = button.getAttribute("data-download-report");

                if (format === "csv") {
                    downloadCsv();
                }
            });
        });

        document.querySelectorAll("[data-print-report]").forEach(function (button) {
            button.addEventListener("click", printReport);
        });
    });

    window.KWUSTReports = {
        downloadCsv: downloadCsv,
        printReport: printReport,
        getReportRows: getReportRows
    };
}(window));
