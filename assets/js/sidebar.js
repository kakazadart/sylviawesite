/* Mobile sidebar behaviour */
document.addEventListener("DOMContentLoaded", function () {
    var menuButton = document.getElementById("menuButton");
    var publicNavigation = document.getElementById("publicNavigation");
    var sidebar = document.querySelector(".sidebar");
    var overlay = document.getElementById("sidebarOverlay");

    function setPublicMenu(open) {
        if (!publicNavigation || !menuButton) {
            return;
        }

        publicNavigation.classList.toggle("show", open);
        menuButton.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function setSidebar(open) {
        if (!sidebar || !menuButton) {
            return;
        }

        sidebar.classList.toggle("show", open);
        menuButton.setAttribute("aria-expanded", open ? "true" : "false");

        if (overlay) {
            overlay.classList.toggle("is-visible", open);
        }
    }

    if (menuButton && publicNavigation) {
        menuButton.addEventListener("click", function () {
            var isOpen = publicNavigation.classList.toggle("show");
            menuButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });
    }

    if (menuButton && sidebar) {
        menuButton.addEventListener("click", function () {
            setSidebar(!sidebar.classList.contains("show"));
        });
    }

    if (overlay) {
        overlay.addEventListener("click", function () {
            setSidebar(false);
        });
    }

    var sidebarLinks = document.querySelectorAll(".sidebar-navigation a");

    sidebarLinks.forEach(function (link) {
        link.addEventListener("click", function () {
            sidebarLinks.forEach(function (item) {
                item.classList.remove("active");
            });
            link.classList.add("active");

            if (window.innerWidth <= 700) {
                setSidebar(false);
            }
        });
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            setSidebar(false);
            setPublicMenu(false);
        }
    });

    if (publicNavigation) {
        publicNavigation.querySelectorAll("a").forEach(function (link) {
            link.addEventListener("click", function () {
                setPublicMenu(false);
            });
        });
    }
});
