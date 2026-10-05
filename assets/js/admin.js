/* Department and super admin approval workspace */
(function (window) {
    "use strict";

    var selectedStudentId = "";
    var selectedDepartmentId = "";
    var lastReviewFocus = null;

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

    function getCurrentUser() {
        return window.KWUST ? window.KWUST.getCurrentUser() : null;
    }

    function getQueueFilters() {
        return {
            search: document.getElementById("adminSearch") ? document.getElementById("adminSearch").value : "",
            status: document.getElementById("adminStatusFilter") ? document.getElementById("adminStatusFilter").value : "all"
        };
    }

    function renderContext(user) {
        var title = document.getElementById("queueTitle");
        var description = document.getElementById("queueDescription");
        var departmentLabel = document.getElementById("adminDepartmentLabel");
        var reportDescription = document.getElementById("reportDescription");
        var reportProgressHeading = document.getElementById("reportProgressHeading");
        var reportStatusHeading = document.getElementById("reportStatusHeading");
        var clearedCardLabel = document.getElementById("clearedCardLabel");

        if (!title || !description || !departmentLabel) {
            return;
        }

        if (user.role === "super") {
            title.textContent = "System-wide clearance queue";
            description.textContent = "Review any student record and monitor every mandatory department.";
            departmentLabel.textContent = "All departments";

            if (reportDescription) {
                reportDescription.textContent = "View a system-wide summary table or export the current records.";
            }

            if (reportProgressHeading && reportStatusHeading && clearedCardLabel) {
                reportProgressHeading.textContent = "Progress";
                reportStatusHeading.textContent = "Overall status";
                clearedCardLabel.textContent = "Fully cleared records";
            }
        } else {
            var department = window.KWUST.getDepartment(user.department);
            title.textContent = department ? department.name + " approval queue" : "Department approval queue";
            description.textContent = "Only requests waiting for your office are shown.";
            departmentLabel.textContent = department ? department.shortName + " scope" : "Department scope";

            if (reportDescription) {
                reportDescription.textContent = "Review records for your office only; other department statuses stay scoped to their owners.";
            }

            if (reportProgressHeading && reportStatusHeading && clearedCardLabel) {
                reportProgressHeading.textContent = "Office clearance";
                reportStatusHeading.textContent = "Office status";
                clearedCardLabel.textContent = "Cleared office records";
            }
        }
    }

    function renderQueue(user) {
        var queueBody = document.getElementById("adminQueueBody");
        var emptyState = document.getElementById("adminQueueEmpty");
        var resultLabel = document.getElementById("queueResultLabel");

        if (!queueBody) {
            return;
        }

        var filters = getQueueFilters();
        var students = window.KWUST.getVisibleStudents(user, filters);
        var stats = window.KWUST.getAdminStats(user);
        var queueTotal = document.getElementById("adminQueueTotal");
        var pendingTotal = document.getElementById("adminPendingTotal");
        var flaggedTotal = document.getElementById("adminFlaggedTotal");
        var clearedTotal = document.getElementById("adminClearedTotal");

        if (queueTotal) {
            queueTotal.textContent = stats.total;
        }

        if (pendingTotal) {
            pendingTotal.textContent = stats.pending;
        }

        if (flaggedTotal) {
            flaggedTotal.textContent = stats.flagged;
        }

        if (clearedTotal) {
            clearedTotal.textContent = stats.cleared;
        }

        if (resultLabel) {
            resultLabel.textContent = students.length + " results";
        }

        if (emptyState) {
            emptyState.hidden = students.length !== 0;
        }

        queueBody.innerHTML = students.map(function (student) {
            var progress = window.KWUST.getProgress(student);
            var officeStatus = user.role === "department"
                ? student.checklist[user.department].status
                : progress === 100 ? "cleared" : window.KWUST.getFlaggedCount(student) > 0 ? "flagged" : "pending";
            var statusLabel = user.role === "department" ? statusText(officeStatus) : progress === 100 ? "Cleared" : officeStatus === "flagged" ? "Rejected" : "In progress";

            return '<tr data-queue-student="' + escapeHtml(student.id) + '">' +
                "<td><span class=\"table-primary-text\">" + escapeHtml(student.name) + "</span><span class=\"table-secondary-text\">" + escapeHtml(student.id) + "</span></td>" +
                "<td>" + escapeHtml(student.degree) + "</td>" +
                '<td><div class="mini-progress" aria-label="Progress ' + progress + '%"><span data-progress-bar="' + progress + '"></span></div><small>' + progress + "%</small></td>" +
                '<td><span class="' + statusClass(officeStatus) + '">' + statusLabel + "</span></td>" +
                '<td><button class="button button-light button-small" type="button" data-review-student="' + escapeHtml(student.id) + '">Review</button></td>' +
                "</tr>";
        }).join("");

        queueBody.querySelectorAll("[data-progress-bar]").forEach(function (bar) {
            bar.style.width = bar.getAttribute("data-progress-bar") + "%";
        });
    }

    function renderReports(user) {
        var reportBody = document.getElementById("reportTableBody");

        if (!reportBody || !window.KWUST) {
            return;
        }

        var students = window.KWUST.getReportStudents(user);
        reportBody.innerHTML = students.map(function (student) {
            var officeStatus = user && user.role === "department" ? student.checklist[user.department].status : "";
            var progress = user && user.role === "department" ? officeStatus === "cleared" ? 100 : 0 : window.KWUST.getProgress(student);
            var reportStatus = user && user.role === "department" ? statusText(officeStatus) : student.status === "alumni" ? "Alumni archived" : progress === 100 ? "Fully cleared" : progress > 0 ? "In progress" : "Not started";
            var reportClass = user && user.role === "department" ? statusClass(officeStatus) : student.status === "alumni" || progress === 100 ? "status-cleared" : progress > 0 ? "status-review" : "status-pending";

            return "<tr>" +
                "<td>" + escapeHtml(student.id) + "</td>" +
                "<td>" + escapeHtml(student.name) + "</td>" +
                "<td>" + escapeHtml(student.degree) + "</td>" +
                "<td>" + progress + "%</td>" +
                '<td><span class="' + reportClass + '">' + reportStatus + "</span></td>" +
                "</tr>";
        }).join("");
    }

    function auditActionText(action) {
        var labels = {
            CHECKLIST_GENERATED: "Checklist generated",
            PROFILE_UPDATED: "Profile updated",
            REQUEST_SUBMITTED: "Request submitted",
            REQUEST_RESOLVED: "Request resolved",
            REQUEST_REJECTED: "Request rejected",
            REQUEST_REOPENED: "Request reopened",
            DEPARTMENT_CLEARED: "Department cleared",
            DEPARTMENT_FLAGGED: "Department rejected",
            DEPARTMENT_PENDING: "Department pending",
            ALUMNI_ARCHIVED: "Alumni archived",
            ALUMNI_PROFILE_UPDATED: "Alumni profile updated"
        };

        return labels[action] || "System event";
    }

    function renderAudit(user) {
        var auditBody = document.getElementById("auditTableBody");

        if (!auditBody || !window.KWUST) {
            return;
        }

        auditBody.innerHTML = window.KWUST.getAuditEntries(30, user).map(function (entry) {
            var student = window.KWUST.getStudent(entry.studentId);
            return "<tr>" +
                "<td>" + escapeHtml(entry.createdAt) + "</td>" +
                "<td>" + escapeHtml(entry.actor) + "</td>" +
                "<td>" + escapeHtml(student ? student.name : entry.studentId) + "</td>" +
                "<td><span class=\"table-primary-text\">" + escapeHtml(auditActionText(entry.action)) + "</span><span class=\"table-secondary-text\">" + escapeHtml(entry.details) + "</span></td>" +
                "</tr>";
        }).join("");
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

    function requestTypeText(type) {
        var labels = {
            financial: "Financial record",
            identity: "Identity document",
            academic: "Academic record",
            other: "Other item"
        };

        return labels[type] || type;
    }

    function getRequestFilters() {
        return {
            search: document.getElementById("adminRequestSearch") ? document.getElementById("adminRequestSearch").value : "",
            status: document.getElementById("adminRequestStatus") ? document.getElementById("adminRequestStatus").value : "all"
        };
    }

    function renderRequests(user) {
        var requestBody = document.getElementById("adminRequestBody");
        var emptyState = document.getElementById("adminRequestEmpty");
        var resultLabel = document.getElementById("requestResultLabel");

        if (!requestBody) {
            return;
        }

        var requests = window.KWUST.getRequestsForUser(user, getRequestFilters());

        if (resultLabel) {
            resultLabel.textContent = requests.length + " results";
        }

        if (emptyState) {
            emptyState.hidden = requests.length !== 0;
        }

        requestBody.innerHTML = requests.map(function (request) {
            var student = window.KWUST.getStudent(request.studentId);
            var isArchived = student && student.status === "alumni";
            var fileAction = !isArchived && request.fileName && request.fileStored ? '<button class="button button-light button-small" type="button" data-request-file="' + escapeHtml(request.id) + '">Download file</button>' : "";
            var action = isArchived
                ? '<span class="table-secondary-text">Archived record</span>'
                : request.status === "pending"
                    ? '<button class="button button-success button-small" type="button" data-request-action="resolved" data-request-id="' + escapeHtml(request.id) + '">Resolve</button><button class="button button-warning button-small" type="button" data-request-action="rejected" data-request-id="' + escapeHtml(request.id) + '">Reject</button>'
                    : '<button class="button button-light button-small" type="button" data-request-action="pending" data-request-id="' + escapeHtml(request.id) + '">Reopen</button>';
            action += fileAction;

            return "<tr>" +
                "<td><span class=\"table-primary-text\">" + escapeHtml(student ? student.name : request.studentId) + "</span><span class=\"table-secondary-text\">" + escapeHtml(request.studentId) + "</span></td>" +
                "<td><span class=\"table-primary-text\">" + escapeHtml(requestTypeText(request.type)) + "</span><span class=\"table-secondary-text\">" + escapeHtml(request.fileName || "No file attached") + (request.fileName && !request.fileStored ? " (metadata only)" : "") + "</span></td>" +
                "<td>" + escapeHtml(request.details) + "</td>" +
                "<td><span class=\"" + requestStatusClass(request.status) + "\">" + requestStatusText(request.status) + "</span>" + (request.feedback ? "<span class=\"table-secondary-text\">" + escapeHtml(request.feedback) + "</span>" : "") + "</td>" +
                "<td><div class=\"table-actions\">" + action + "</div></td>" +
                "</tr>";
        }).join("");
    }

    function renderReviewChecklist(student, user) {
        var checklistElement = document.getElementById("reviewChecklist");
        var departmentSelect = document.getElementById("reviewDepartment");

        if (!checklistElement || !departmentSelect || !window.KWUST) {
            return;
        }

        var allDepartments = window.KWUST.getDepartments();
        var departments = user.role === "department" ? allDepartments.filter(function (department) {
            return department.id === user.department;
        }) : allDepartments;
        var firstDepartment = departments[0] ? departments[0].id : "";
        selectedDepartmentId = user.role === "department" ? user.department : selectedDepartmentId || firstDepartment;

        departmentSelect.innerHTML = departments.map(function (department) {
            var disabled = user.role === "department" && department.id !== user.department;
            return '<option value="' + escapeHtml(department.id) + '"' + (disabled ? " disabled" : "") + ">" + escapeHtml(department.name) + "</option>";
        }).join("");
        departmentSelect.value = selectedDepartmentId;

        checklistElement.innerHTML = departments.map(function (department) {
            var item = student.checklist[department.id];
            return '<div class="review-checklist-item"><div><strong>' + escapeHtml(department.name) + "</strong><small>" + escapeHtml(department.description) + "</small></div><span class=\"" + statusClass(item.status) + "\">" + statusText(item.status) + "</span></div>";
        }).join("");

        updateReviewFeedback();
    }

    function updateReviewFeedback() {
        var student = window.KWUST.getStudent(selectedStudentId);
        var feedbackBox = document.getElementById("reviewFeedback");
        var feedbackText = document.getElementById("reviewFeedbackText");
        var department = window.KWUST.getDepartment(selectedDepartmentId);

        if (!student || !department || !feedbackBox || !feedbackText) {
            return;
        }

        var feedback = student.checklist[department.id].feedback;
        feedbackBox.hidden = !feedback;
        feedbackText.textContent = feedback || "";
    }

    function getReviewFocusableElements(modal) {
        return Array.prototype.slice.call(modal.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]")).filter(function (element) {
            return element.offsetParent !== null;
        });
    }

    function openReview(studentId) {
        var user = getCurrentUser();
        var student = window.KWUST.getStudent(studentId);
        var modal = document.getElementById("reviewModal");
        var summary = document.getElementById("reviewStudentSummary");

        if (!user || !student || student.status === "alumni" || !modal) {
            return;
        }

        selectedStudentId = studentId;
        selectedDepartmentId = user.role === "department" ? user.department : (selectedDepartmentId || window.KWUST.getDepartments()[0].id);
        summary.textContent = student.name + " · " + student.id + " · " + student.degree;
        renderReviewChecklist(student, user);
        var rejectionForm = document.getElementById("reviewRejectForm");

        if (rejectionForm) {
            rejectionForm.reset();
        }

        lastReviewFocus = document.activeElement;
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        var firstFocusable = getReviewFocusableElements(modal)[0];

        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    function closeReview() {
        var modal = document.getElementById("reviewModal");

        if (modal) {
            modal.classList.remove("show");
            modal.setAttribute("aria-hidden", "true");
        }

        document.body.style.overflow = "";

        if (lastReviewFocus && typeof lastReviewFocus.focus === "function") {
            lastReviewFocus.focus();
            lastReviewFocus = null;
        }
    }

    function renderAdmin() {
        var user = getCurrentUser();

        if (!user) {
            return;
        }

        renderContext(user);
        renderQueue(user);
        renderRequests(user);
        renderReports(user);
        renderAudit(user);

        var settingsSection = document.getElementById("settings");
        var settingsNavigation = document.getElementById("settingsNavigation");

        if (settingsSection) {
            settingsSection.hidden = user.role !== "super";
        }

        if (settingsNavigation) {
            settingsNavigation.hidden = user.role !== "super";
        }
    }

    function approveSelected() {
        var user = getCurrentUser();
        var student = window.KWUST.getStudent(selectedStudentId);
        var department = window.KWUST.getDepartment(selectedDepartmentId);

        if (!user || !student || !department) {
            return;
        }

        if (!window.confirm("Confirm that " + department.name + " has no outstanding dues for " + student.name + ".")) {
            return;
        }

        var updatedStudent = window.KWUST.updateDepartmentStatus(student.id, selectedDepartmentId, "cleared", "", user.name, user);

        if (!updatedStudent) {
            window.alert("The student must complete their profile before a department can be cleared.");
            return;
        }

        closeReview();
        window.dispatchEvent(new CustomEvent("kwust:state-changed"));
    }

    function flagSelected(event) {
        event.preventDefault();
        var form = event.currentTarget;
        var user = getCurrentUser();
        var student = window.KWUST.getStudent(selectedStudentId);
        var department = window.KWUST.getDepartment(selectedDepartmentId);

        if (!user || !student || !department || !window.formValidation.validateForm(form)) {
            return;
        }

        var reason = form.elements.rejectionReason.value.trim();
        var updatedStudent = window.KWUST.updateDepartmentStatus(student.id, selectedDepartmentId, "flagged", reason, user.name, user);

        if (!updatedStudent) {
            window.alert("The rejection could not be saved. Check the reason and try again.");
            return;
        }

        closeReview();
        window.dispatchEvent(new CustomEvent("kwust:state-changed"));
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (!window.KWUST) {
            return;
        }

        var rejectForm = document.getElementById("reviewRejectForm");

        if (rejectForm && window.formValidation) {
            window.formValidation.attachLiveValidation(rejectForm);
        }

        var searchForm = document.getElementById("adminSearchForm");

        if (searchForm) {
            searchForm.addEventListener("submit", function (event) {
                event.preventDefault();
                renderAdmin();
            });
        }

        var statusFilter = document.getElementById("adminStatusFilter");

        if (statusFilter) {
            statusFilter.addEventListener("change", renderAdmin);
        }

        var requestSearchForm = document.getElementById("adminRequestSearchForm");
        var requestStatusFilter = document.getElementById("adminRequestStatus");

        if (requestSearchForm) {
            requestSearchForm.addEventListener("submit", function (event) {
                event.preventDefault();
                var user = getCurrentUser();

                if (user) {
                    renderRequests(user);
                }
            });
        }

        if (requestStatusFilter) {
            requestStatusFilter.addEventListener("change", function () {
                var user = getCurrentUser();

                if (user) {
                    renderRequests(user);
                }
            });
        }

        var queueBody = document.getElementById("adminQueueBody");

        if (queueBody) {
            queueBody.addEventListener("click", function (event) {
                var reviewButton = event.target.closest("[data-review-student]");

                if (reviewButton) {
                    openReview(reviewButton.getAttribute("data-review-student"));
                }
            });
        }

        var requestBody = document.getElementById("adminRequestBody");

        if (requestBody) {
            requestBody.addEventListener("click", function (event) {
                var fileButton = event.target.closest("[data-request-file]");
                var actionButton = event.target.closest("[data-request-action]");
                var user = getCurrentUser();

                if (!user) {
                    return;
                }

                if (fileButton) {
                    var fileRequestId = fileButton.getAttribute("data-request-file");
                    var request = window.KWUST.getRequestsForUser(user).filter(function (item) {
                        return item.id === fileRequestId;
                    })[0];

                    window.KWUST.getRequestFile(user, fileRequestId).then(function (file) {
                        if (!file || !request) {
                            throw new Error("The supporting document is not stored in this browser.");
                        }

                        var url = URL.createObjectURL(file);
                        var link = document.createElement("a");
                        link.href = url;
                        link.download = request.fileName || "supporting-document";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.setTimeout(function () {
                            URL.revokeObjectURL(url);
                        }, 0);
                    }).catch(function () {
                        window.alert("The supporting document is not stored in this browser.");
                    });
                    return;
                }

                if (!actionButton) {
                    return;
                }

                var action = actionButton.getAttribute("data-request-action");
                var requestId = actionButton.getAttribute("data-request-id");
                var feedback = "";

                if (action === "rejected") {
                    feedback = window.prompt("Explain what the student must correct.") || "";

                    if (!feedback.trim()) {
                        return;
                    }
                } else if (!window.confirm("Confirm this request status change?")) {
                    return;
                }

                var updatedRequest = window.KWUST.updateRequestStatus(user, requestId, action, feedback);

                if (!updatedRequest) {
                    window.alert("The request could not be updated. Check the status and feedback.");
                    return;
                }

                window.dispatchEvent(new CustomEvent("kwust:state-changed"));
            });
        }

        var departmentSelect = document.getElementById("reviewDepartment");

        if (departmentSelect) {
            departmentSelect.addEventListener("change", function () {
                selectedDepartmentId = departmentSelect.value;
                updateReviewFeedback();
            });
        }

        var approveButton = document.getElementById("approveButton");

        if (approveButton) {
            approveButton.addEventListener("click", approveSelected);
        }

        if (rejectForm) {
            rejectForm.addEventListener("submit", flagSelected);
        }

        document.querySelectorAll("[data-close-review]").forEach(function (button) {
            button.addEventListener("click", closeReview);
        });

        var reviewModal = document.getElementById("reviewModal");

        if (reviewModal) {
            reviewModal.addEventListener("click", function (event) {
                if (event.target === reviewModal) {
                    closeReview();
                }
            });
        }

        document.addEventListener("keydown", function (event) {
            if (!reviewModal || !reviewModal.classList.contains("show")) {
                return;
            }

            if (event.key === "Escape") {
                closeReview();
                return;
            }

            if (event.key === "Tab") {
                var focusableElements = getReviewFocusableElements(reviewModal);

                if (focusableElements.length === 0) {
                    return;
                }

                var firstFocusable = focusableElements[0];
                var lastFocusable = focusableElements[focusableElements.length - 1];

                if (event.shiftKey && document.activeElement === firstFocusable) {
                    event.preventDefault();
                    lastFocusable.focus();
                } else if (!event.shiftKey && document.activeElement === lastFocusable) {
                    event.preventDefault();
                    firstFocusable.focus();
                }
            }
        });

        var resetButton = document.getElementById("resetDemoButton");

        if (resetButton) {
            resetButton.addEventListener("click", function () {
                if (window.confirm("Reset all local demo clearance records and demo passwords?")) {
                    var resetState = window.KWUST.resetDemoData();

                    if (!resetState) {
                        window.alert("The demo records could not be reset in this browser.");
                        return;
                    }

                    if (window.KWUSTAuth && window.KWUSTAuth.clearPasswordOverrides) {
                        window.KWUSTAuth.clearPasswordOverrides();
                    }

                    if (window.KWUSTAuth && window.KWUSTAuth.clearRegisteredAccounts) {
                        window.KWUSTAuth.clearRegisteredAccounts();
                    }

                    window.dispatchEvent(new CustomEvent("kwust:state-changed"));
                }
            });
        }

        renderAdmin();
        window.addEventListener("kwust:state-changed", renderAdmin);
    });

    window.KWUSTAdmin = {
        render: renderAdmin,
        openReview: openReview,
        closeReview: closeReview
    };
}(window));
