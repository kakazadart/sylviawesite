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

    function isSafeExternalUrl(value) {
        try {
            return new URL(value).protocol === "https:";
        } catch (error) {
            return false;
        }
    }

    function getCurrentAlumnus() {
        var user = window.KWUST ? window.KWUST.getCurrentUser() : null;

        if (!user) {
            return null;
        }

        return window.KWUST.searchAlumni({}).filter(function (alumnus) {
            return alumnus.id === user.identifier;
        })[0] || null;
    }

    function getFilters() {
        return {
            name: document.getElementById("alumniName") ? document.getElementById("alumniName").value : "",
            year: document.getElementById("alumniYear") ? document.getElementById("alumniYear").value : "",
            course: document.getElementById("alumniCourse") ? document.getElementById("alumniCourse").value : ""
        };
    }

    function populateYearFilter() {
        var yearSelect = document.getElementById("alumniYear");

        if (!yearSelect || !window.KWUST) {
            return;
        }

        var years = window.KWUST.searchAlumni({}).map(function (alumnus) {
            return String(alumnus.graduationYear);
        }).filter(function (year, index, values) {
            return year && values.indexOf(year) === index;
        }).sort(function (first, second) {
            return Number(second) - Number(first);
        });

        while (yearSelect.options.length > 1) {
            yearSelect.remove(1);
        }

        years.forEach(function (year) {
            var option = document.createElement("option");
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    }

    function renderDirectory() {
        var tableBody = document.getElementById("alumniTableBody");
        var emptyState = document.getElementById("alumniEmpty");
        var resultCount = document.getElementById("alumniResultCount");

        if (!tableBody || !window.KWUST) {
            return;
        }

        var alumni = window.KWUST.searchAlumni(getFilters());

        if (resultCount) {
            resultCount.textContent = alumni.length + " results";
        }

        if (emptyState) {
            emptyState.hidden = alumni.length !== 0;
        }

        tableBody.innerHTML = alumni.map(function (alumnus) {
            var profileLink = isSafeExternalUrl(alumnus.professionalLinks)
                ? '<a class="inline-link" href="' + escapeHtml(alumnus.professionalLinks) + '" target="_blank" rel="noopener noreferrer">Open profile</a>'
                : '<span class="muted-text">Not provided</span>';

            return "<tr>" +
                "<td><span class=\"table-primary-text\">" + escapeHtml(alumnus.name) + "</span><span class=\"table-secondary-text\">" + escapeHtml(alumnus.id) + "</span></td>" +
                "<td>" + escapeHtml(alumnus.degree) + "</td>" +
                "<td>" + escapeHtml(alumnus.graduationYear) + "</td>" +
                "<td>" + escapeHtml(alumnus.employmentStatus) + "</td>" +
                "<td>" + profileLink + "</td>" +
                "</tr>";
        }).join("");
    }

    function renderCurrentProfile() {
        var alumnus = getCurrentAlumnus();
        var profileSection = document.querySelector("[data-alumni-profile-section]");
        var profileLink = document.querySelector(".sidebar-navigation a[href='#my-profile']");
        var form = document.getElementById("alumniProfileForm");

        if (profileSection) {
            profileSection.hidden = !alumnus;
        }

        if (profileLink) {
            profileLink.hidden = !alumnus;
        }

        if (!alumnus || !form) {
            return;
        }

        form.elements.phone.value = alumnus.phone;
        form.elements.employmentStatus.value = alumnus.employmentStatus;
        form.elements.professionalLinks.value = alumnus.professionalLinks === "Not provided" ? "" : alumnus.professionalLinks;
    }

    function renderAlumni() {
        renderDirectory();
        renderCurrentProfile();
    }

    document.addEventListener("DOMContentLoaded", function () {
        var searchForm = document.getElementById("alumniSearchForm");

        if (searchForm) {
            searchForm.addEventListener("submit", function (event) {
                event.preventDefault();
                renderDirectory();
            });
        }

        populateYearFilter();
        renderAlumni();
        window.addEventListener("kwust:state-changed", renderAlumni);
    });

    window.KWUSTAlumni = {
        render: renderAlumni,
        escapeHtml: escapeHtml
    };
}(window));
