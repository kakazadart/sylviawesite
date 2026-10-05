/* Student and admin notification rendering */
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

    function notificationIcon(type) {
        if (type === "success") {
            return "OK";
        }

        if (type === "warning") {
            return "!";
        }

        return "i";
    }

    function renderNotifications() {
        if (!window.KWUST) {
            return;
        }

        var user = window.KWUST.getCurrentUser();
        var notificationList = document.getElementById("notificationList");

        if (!user || !notificationList) {
            return;
        }

        var notifications = window.KWUST.getNotificationsForUser(user).slice(0, 8);
        notificationList.innerHTML = notifications.length === 0
            ? '<div class="empty-state"><strong>You are all caught up.</strong><p>New clearance updates will appear here.</p></div>'
            : notifications.map(function (notification) {
                var unreadClass = window.KWUST.isNotificationReadForUser(notification, user) ? "" : " unread";
                return '<article class="notification-item' + unreadClass + '" data-notification-id="' + escapeHtml(notification.id) + '">' +
                    '<span class="notification-icon" aria-hidden="true">' + notificationIcon(notification.type) + "</span>" +
                    "<div><h3>" + escapeHtml(notification.title) + "</h3><p>" + escapeHtml(notification.message) + "</p><small>" + escapeHtml(notification.createdAt) + "</small></div>" +
                    '<button class="notification-dismiss" type="button" data-dismiss-notification aria-label="Dismiss notification">×</button>' +
                    "</article>";
            }).join("");

        bindNotificationActions();
        updateUnreadCount();
    }

    function bindNotificationActions() {
        var notifications = document.querySelectorAll("[data-notification-id]");

        notifications.forEach(function (notification) {
            var dismissButton = notification.querySelector("[data-dismiss-notification]");

            if (dismissButton) {
                dismissButton.addEventListener("click", function () {
                    var user = window.KWUST.getCurrentUser();

                    if (user) {
                        var notificationId = notification.getAttribute("data-notification-id");
                        var markedRead = window.KWUST.markNotificationRead(user, notificationId);
                        var matchingNotification = window.KWUST.getNotificationsForUser(user).filter(function (item) {
                            return item.id === notificationId;
                        })[0];

                        if (markedRead || matchingNotification && window.KWUST.isNotificationReadForUser(matchingNotification, user)) {
                            notification.hidden = true;
                            notification.classList.remove("unread");
                        }
                    }

                    updateUnreadCount();
                });
            }

            notification.addEventListener("click", function () {
                var user = window.KWUST.getCurrentUser();

                if (user) {
                    var notificationId = notification.getAttribute("data-notification-id");
                    var markedRead = window.KWUST.markNotificationRead(user, notificationId);
                    var matchingNotification = window.KWUST.getNotificationsForUser(user).filter(function (item) {
                        return item.id === notificationId;
                    })[0];

                    if (markedRead || matchingNotification && window.KWUST.isNotificationReadForUser(matchingNotification, user)) {
                        notification.classList.remove("unread");
                    }
                }

                updateUnreadCount();
            });
        });
    }

    function updateUnreadCount() {
        var user = window.KWUST ? window.KWUST.getCurrentUser() : null;
        var unreadCount = user && window.KWUST ? window.KWUST.getUnreadNotificationCount(user) : 0;
        var countElements = document.querySelectorAll("[data-unread-count]");

        countElements.forEach(function (element) {
            element.textContent = unreadCount;
            element.hidden = unreadCount === 0;
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        renderNotifications();

        var markAllButton = document.getElementById("markAllReadButton");

        if (markAllButton) {
            markAllButton.addEventListener("click", function () {
                var user = window.KWUST ? window.KWUST.getCurrentUser() : null;

                if (user && window.KWUST.markNotificationsRead(user)) {
                    document.querySelectorAll(".notification-item.unread").forEach(function (item) {
                        item.classList.remove("unread");
                    });
                }

                updateUnreadCount();
            });
        }

        window.addEventListener("kwust:state-changed", renderNotifications);
    });

    window.KWUSTNotifications = {
        render: renderNotifications,
        updateUnreadCount: updateUnreadCount
    };
}(window));
