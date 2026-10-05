/* Student clearance modal and request helpers */
(function (window) {
    "use strict";

    var lastFocusedElement = null;

    function getFocusableElements(modal) {
        return Array.prototype.slice.call(modal.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]")).filter(function (element) {
            return element.offsetParent !== null;
        });
    }

    function openModal() {
        var modal = document.getElementById("requestModal");

        if (!modal) {
            return;
        }

        lastFocusedElement = document.activeElement;
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        var form = document.getElementById("requestForm");
        var message = document.getElementById("requestMessage");
        var fileName = modal.querySelector(".file-name");

        if (form) {
            form.reset();

            if (window.formValidation) {
                window.formValidation.clearErrors(form);
            }
        }

        if (message) {
            message.textContent = "";
            message.className = "form-help";
        }

        if (fileName) {
            fileName.textContent = "";
        }

        var firstInput = modal.querySelector("input, select, textarea");

        if (firstInput) {
            firstInput.focus();
        }
    }

    function closeModal() {
        var modal = document.getElementById("requestModal");

        if (!modal) {
            return;
        }

        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";

        if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
            lastFocusedElement.focus();
            lastFocusedElement = null;
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        var openButtons = document.querySelectorAll("[data-open-request]");
        var closeButtons = document.querySelectorAll("[data-close-modal]");
        var modal = document.getElementById("requestModal");

        openButtons.forEach(function (button) {
            button.addEventListener("click", openModal);
        });

        closeButtons.forEach(function (button) {
            button.addEventListener("click", closeModal);
        });

        if (modal) {
            modal.addEventListener("click", function (event) {
                if (event.target === modal) {
                    closeModal();
                }
            });
        }

        document.addEventListener("keydown", function (event) {
            if (!modal || !modal.classList.contains("show")) {
                return;
            }

            if (event.key === "Escape") {
                closeModal();
                return;
            }

            if (event.key === "Tab") {
                var focusableElements = getFocusableElements(modal);

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

        window.addEventListener("clearance:request-added", function () {
            window.dispatchEvent(new CustomEvent("kwust:state-changed"));
        });
    });

    window.KWUSTClearance = {
        openModal: openModal,
        closeModal: closeModal
    };
}(window));
