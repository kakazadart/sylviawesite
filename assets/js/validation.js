/* Small reusable form helpers */
(function (window) {
    function getField(form, name) {
        return form.elements[name];
    }

    function setError(form, name, message) {
        var field = getField(form, name);
        var group = field ? field.closest(".form-group") : null;
        var error = group ? group.querySelector(".form-error") : null;

        if (field && field.setAttribute) {
            field.setAttribute("aria-invalid", message ? "true" : "false");
        }

        if (field && error) {
            if (!error.id) {
                error.id = field.name + "-error";
            }

            field.setAttribute("aria-describedby", error.id);
        }

        if (group) {
            group.classList.toggle("has-error", Boolean(message));
        }

        if (error) {
            error.textContent = message || "";
        }
    }

    function clearErrors(form) {
        var fields = form.querySelectorAll("input, select, textarea");

        fields.forEach(function (field) {
            setError(form, field.name, "");
        });
    }

    function containsUnsafeCharacters(value) {
        return /[\u0000-\u001f<>]/.test(value);
    }

    function isValidHttpsUrl(value) {
        try {
            return new URL(value).protocol === "https:";
        } catch (error) {
            return false;
        }
    }

    function validateFile(field) {
        var file = field.files && field.files[0];
        var message = "";
        var allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

        if (file && file.size > 5 * 1024 * 1024) {
            message = "Choose a file smaller than 5 MB.";
        }

        if (file && !/\.(pdf|jpe?g|png)$/i.test(file.name)) {
            message = "Choose a PDF, JPG, or PNG file.";
        } else if (file && allowedTypes.indexOf(String(file.type || "").toLowerCase()) === -1) {
            message = "Choose a PDF, JPG, or PNG file.";
        }

        setError(field.form, field.name, message);
        return message === "";
    }

    function validateField(form, field) {
        var value = field.value.trim();
        var message = "";

        if (field.type === "file") {
            return validateFile(field);
        }

        if (field.hasAttribute("required") && value === "") {
            message = "This field is required.";
        } else if (value !== "" && containsUnsafeCharacters(value)) {
            message = "Remove control characters or angle brackets.";
        } else if (field.minLength > 0 && value.length < field.minLength) {
            message = "Enter at least " + field.minLength + " characters.";
        } else if (field.maxLength > 0 && value.length > field.maxLength) {
            message = "Use no more than " + field.maxLength + " characters.";
        } else if (field.type === "email" && value !== "" && field.validity.typeMismatch) {
            message = "Enter a valid email address.";
        } else if (field.type === "url" && value !== "" && !isValidHttpsUrl(value)) {
            message = "Enter a valid URL beginning with https://.";
        } else if (field.type === "tel" && value !== "" && !/^[+0-9()\-\s]{7,30}$/.test(value)) {
            message = "Enter a valid phone number.";
        } else if (field.type === "password" && value !== "" && value.length < 6) {
            message = "Password must contain at least 6 characters.";
        } else if (field.hasAttribute("data-match")) {
            var matchField = getField(form, field.getAttribute("data-match"));

            if (matchField && value !== matchField.value) {
                message = "Passwords do not match.";
            }
        }

        setError(form, field.name, message);
        return message === "";
    }

    function validateForm(form) {
        var fields = form.querySelectorAll("input, select, textarea");
        var valid = true;
        var firstInvalidField = null;

        fields.forEach(function (field) {
            if (!validateField(form, field)) {
                valid = false;

                if (!firstInvalidField) {
                    firstInvalidField = field;
                }
            }
        });

        if (firstInvalidField) {
            firstInvalidField.focus();
        }

        return valid;
    }

    function attachLiveValidation(form) {
        form.querySelectorAll("input, select, textarea").forEach(function (field) {
            field.addEventListener("blur", function () {
                validateField(form, field);
            });

            if (field.type === "file") {
                field.addEventListener("change", function () {
                    validateFile(field);
                });
            }

            if (field.type === "password" || field.hasAttribute("data-match")) {
                field.addEventListener("input", function () {
                    validateField(form, field);
                });
            }
        });
    }

    window.formValidation = {
        clearErrors: clearErrors,
        setError: setError,
        containsUnsafeCharacters: containsUnsafeCharacters,
        isValidHttpsUrl: isValidHttpsUrl,
        validateFile: validateFile,
        validateField: validateField,
        validateForm: validateForm,
        attachLiveValidation: attachLiveValidation
    };
}(window));
