/* Student checklist and progress rendering */
(function (window) {
    "use strict";

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function statusText(status) {
        if (status === "cleared") {
            return "Cleared";
        }

        if (status === "flagged") {
            return "Rejected";
        }

        return "Pending";
    }

    function statusClass(status) {
        if (status === "cleared") {
            return "status-cleared";
        }

        if (status === "flagged") {
            return "status-rejected";
        }

        return "status-pending";
    }

    function renderChecklist(student) {
        var checklistElement = document.getElementById("clearanceChecklist");

        if (!checklistElement || !window.KWUST) {
            return;
        }

        var departments = window.KWUST.getDepartments();
        var checklistHtml = departments.map(function (department) {
            var item = student.checklist[department.id];
            var feedback = item.feedback
                ? '<p class="checklist-feedback">' + escapeHtml(item.feedback) + "</p>"
                : "<p class=\"muted-text\">No feedback has been added.</p>";

            return '<article class="checklist-item ' + escapeHtml(item.status) + '">' +
                '<div class="checklist-item-header">' +
                '<div><h3>' + escapeHtml(department.name) + "</h3>" +
                '<p>' + escapeHtml(department.description) + "</p></div>" +
                '<span class="' + statusClass(item.status) + '">' + statusText(item.status) + "</span>" +
                "</div>" + feedback +
                '<small>' + (item.updatedAt ? "Updated " + escapeHtml(item.updatedAt) : "Awaiting review") + "</small>" +
                "</article>";
        }).join("");

        checklistElement.innerHTML = checklistHtml;
    }

    function renderActivity(student) {
        var activityElement = document.getElementById("studentActivity");

        if (!activityElement || !window.KWUST) {
            return;
        }

        var activity = window.KWUST.getAuditEntries(5, window.KWUST.getCurrentUser()).filter(function (entry) {
            return entry.studentId === student.id;
        });

        if (activity.length === 0) {
            activityElement.innerHTML = '<p class="muted-text">No recent activity yet.</p>';
            return;
        }

        activityElement.innerHTML = activity.map(function (entry) {
            var dotClass = entry.action === "DEPARTMENT_FLAGGED" ? "rejected" : entry.action === "DEPARTMENT_CLEARED" ? "" : "pending";
            return '<div class="activity-item"><span class="activity-dot ' + dotClass + '" aria-hidden="true"></span><div><p>' + escapeHtml(entry.details) + "</p><small>" + escapeHtml(entry.createdAt) + "</small></div></div>";
        }).join("");
    }

    function requestTypeText(type) {
        var labels = {
            financial: "Financial record",
            identity: "Identity document",
            academic: "Academic record",
            other: "Other item"
        };

        return labels[type] || type;
    }

    function requestStatusText(status) {
        if (status === "resolved") {
            return "Resolved";
        }

        if (status === "rejected") {
            return "Rejected";
        }

        return "Pending";
    }

    function requestStatusClass(status) {
        if (status === "resolved") {
            return "status-cleared";
        }

        if (status === "rejected") {
            return "status-rejected";
        }

        return "status-pending";
    }

    function renderRequests(student) {
        var requestBody = document.getElementById("studentRequestBody");
        var emptyState = document.getElementById("studentRequestEmpty");
        var countElement = document.getElementById("studentRequestCount");
        var user = window.KWUST ? window.KWUST.getCurrentUser() : null;

        if (!requestBody || !user) {
            return;
        }

        var requests = window.KWUST.getRequestsForUser(user, { search: "", status: "all" });

        if (countElement) {
            countElement.textContent = requests.length + (requests.length === 1 ? " request" : " requests");
        }

        if (emptyState) {
            emptyState.hidden = requests.length !== 0;
        }

        requestBody.innerHTML = requests.map(function (request) {
            var feedback = request.feedback ? "<span class=\"table-secondary-text\">" + escapeHtml(request.feedback) + "</span>" : "";

            return "<tr>" +
                "<td><span class=\"table-primary-text\">" + escapeHtml(requestTypeText(request.type)) + "</span><span class=\"table-secondary-text\">" + escapeHtml(request.fileName || "No file attached") + "</span></td>" +
                "<td>" + escapeHtml(request.details) + "</td>" +
                "<td>" + escapeHtml(request.submittedAt || "Not recorded") + "</td>" +
                "<td><span class=\"" + requestStatusClass(request.status) + "\">" + requestStatusText(request.status) + "</span>" + feedback + "</td>" +
                "</tr>";
        }).join("");
    }

    function renderStudent() {
        if (!window.KWUST) {
            return;
        }

        var student = window.KWUST.getCurrentStudent();

        if (!student) {
            return;
        }

        var progress = window.KWUST.getProgress(student);
        var clearedCount = window.KWUST.getClearedCount(student);
        var pendingCount = window.KWUST.getPendingCount(student);
        var flaggedCount = window.KWUST.getFlaggedCount(student);
        var nameElements = document.querySelectorAll("[data-student-name]");
        var idElements = document.querySelectorAll("[data-student-id]");
        var emailElements = document.querySelectorAll("[data-student-email]");
        var degreeElements = document.querySelectorAll("[data-student-degree]");

        nameElements.forEach(function (element) {
            element.textContent = student.name;
        });

        document.querySelectorAll("[data-current-name]").forEach(function (element) {
            element.textContent = student.name;
        });

        idElements.forEach(function (element) {
            element.textContent = student.id;
        });

        emailElements.forEach(function (element) {
            element.textContent = student.email || "Not provided";
        });

        degreeElements.forEach(function (element) {
            element.textContent = student.degree;
        });

        var progressElements = document.querySelectorAll("[data-student-progress]");
        progressElements.forEach(function (element) {
            element.textContent = progress + "%";
        });

        var progressLabelElements = document.querySelectorAll("[data-student-progress-label]");
        progressLabelElements.forEach(function (element) {
            element.textContent = progress + "% complete";
        });

        var progressBarElement = document.getElementById("studentProgressBar");

        if (progressBarElement) {
            progressBarElement.style.width = progress + "%";
        }

        var progressContainer = document.getElementById("studentProgress");

        if (progressContainer) {
            progressContainer.setAttribute("data-progress", progress);
            progressContainer.setAttribute("aria-valuenow", progress);
        }

        var metricElements = document.querySelectorAll("[data-metric]");

        metricElements.forEach(function (element) {
            var metric = element.getAttribute("data-metric");

            if (metric === "progress") {
                element.textContent = progress + "%";
            }

            if (metric === "pending") {
                element.textContent = pendingCount;
            }

            if (metric === "cleared") {
                element.textContent = clearedCount;
            }

            if (metric === "flagged") {
                element.textContent = flaggedCount;
            }
        });

        var currentDateElement = document.getElementById("currentDate");

        if (currentDateElement) {
            currentDateElement.textContent = new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            });
        }

        var summaryElements = document.querySelectorAll("[data-summary-value]");

        summaryElements.forEach(function (element) {
            var summary = element.getAttribute("data-summary-value");

            if (summary === "cleared") {
                element.textContent = clearedCount;
            }

            if (summary === "pending") {
                element.textContent = pendingCount;
            }

            if (summary === "flagged") {
                element.textContent = flaggedCount;
            }
        });

        var firstLoginNotice = document.getElementById("firstLoginNotice");

        if (firstLoginNotice) {
            firstLoginNotice.hidden = student.profileComplete;
        }

        var alumniBanner = document.getElementById("alumniBanner");

        if (alumniBanner) {
            alumniBanner.hidden = student.status !== "alumni";
        }

        var requestActions = document.querySelectorAll("[data-student-request-action]");

        requestActions.forEach(function (element) {
            element.hidden = student.status === "alumni";
            var requestButton = element.querySelector("[data-open-request]");

            if (requestButton) {
                requestButton.disabled = student.status === "alumni";
            }
        });

        var profileForm = document.getElementById("profileForm");

        if (profileForm) {
            profileForm.elements.fullName.value = student.name;
            profileForm.elements.studentNumber.value = student.id;
            profileForm.elements.email.value = student.email;
            profileForm.elements.phone.value = student.phone;
            profileForm.elements.degree.value = student.degree;
        }

        renderChecklist(student);
        renderActivity(student);
        renderRequests(student);
    }

    document.addEventListener("DOMContentLoaded", function () {
        renderStudent();
        window.addEventListener("kwust:state-changed", renderStudent);
    });

    window.KWUSTDashboard = {
        render: renderStudent,
        escapeHtml: escapeHtml,
        statusText: statusText,
        statusClass: statusClass
    };
}(window));
