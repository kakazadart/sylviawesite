/* Shared page behaviour */
document.addEventListener("DOMContentLoaded", function () {
    var year = document.getElementById("currentYear");

    if (year) {
        year.textContent = new Date().getFullYear();
    }

    var printButton = document.getElementById("printPageButton");

    if (printButton) {
        printButton.addEventListener("click", function () {
            window.print();
        });
    }

    var currentUser = window.KWUST ? window.KWUST.getCurrentUser() : null;

    if (currentUser) {
        var nameElements = document.querySelectorAll("[data-current-name]");
        var idElements = document.querySelectorAll("[data-current-id]");
        var roleElements = document.querySelectorAll("[data-current-role]");

        nameElements.forEach(function (element) {
            element.textContent = currentUser.name;
        });

        idElements.forEach(function (element) {
            element.textContent = "ID: " + currentUser.identifier;
        });

        roleElements.forEach(function (element) {
            element.textContent = window.KWUSTAuth ? window.KWUSTAuth.roleLabel(currentUser.role) : currentUser.role;
        });
    }
});
