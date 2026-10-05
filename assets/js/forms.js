/* Profile, alumni, and clearance form interactions */
document.addEventListener("DOMContentLoaded", function () {
    var validation = window.formValidation;

    var passwordButtons = document.querySelectorAll("[data-toggle-password]");

    passwordButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            var targetId = button.getAttribute("data-toggle-password");
            var passwordField = document.getElementById(targetId);

            if (!passwordField) {
                return;
            }

            var isPassword = passwordField.type === "password";
            passwordField.type = isPassword ? "text" : "password";
            button.textContent = isPassword ? "Hide" : "Show";
            button.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
            button.setAttribute("aria-pressed", String(isPassword));
        });
    });

    var forms = document.querySelectorAll("#loginForm, #resetForm, #registerForm, #verifyForm, #profileForm, #requestForm, #alumniProfileForm, #adminSearchForm");

    forms.forEach(function (form) {
        if (validation) {
            validation.attachLiveValidation(form);
        }
    });

    var profileForm = document.getElementById("profileForm");

    if (profileForm && validation && window.KWUST) {
        profileForm.addEventListener("submit", function (event) {
            event.preventDefault();

            if (!validation.validateForm(profileForm)) {
                return;
            }

            var student = window.KWUST.getCurrentStudent();
            var currentUser = window.KWUST.getCurrentUser();

            if (!student || !currentUser) {
                return;
            }

            var profileMessage = document.getElementById("profileMessage");

            if (profileMessage) {
                profileMessage.textContent = "";
            }

            var updatedStudent = window.KWUST.updateProfile(student.id, {
                name: profileForm.elements.fullName.value.trim(),
                email: profileForm.elements.email.value.trim(),
                phone: profileForm.elements.phone.value.trim(),
                degree: profileForm.elements.degree.value.trim()
            }, currentUser);

            if (!updatedStudent) {
                if (profileMessage) {
                    profileMessage.textContent = "Profile could not be saved. Check the details and try again.";
                    profileMessage.className = "form-help text-error";
                }
                return;
            }

            if (profileMessage) {
                profileMessage.textContent = "Profile saved. Your clearance checklist is up to date.";
                profileMessage.className = "form-help text-success";
            }

            window.dispatchEvent(new CustomEvent("kwust:state-changed"));
        });
    }

    var alumniProfileForm = document.getElementById("alumniProfileForm");

    if (alumniProfileForm && validation && window.KWUST) {
        alumniProfileForm.addEventListener("submit", function (event) {
            event.preventDefault();

            if (!validation.validateForm(alumniProfileForm)) {
                return;
            }

            var user = window.KWUST.getCurrentUser();

            var canUpdateAlumniProfile = user && (user.role === "alumni" || user.role === "student" && window.KWUST.getStudent(user.identifier) && window.KWUST.getStudent(user.identifier).status === "alumni");

            if (!canUpdateAlumniProfile) {
                return;
            }

            var alumniMessage = document.getElementById("alumniMessage");

            if (alumniMessage) {
                alumniMessage.textContent = "";
            }

            var updatedAlumnus = window.KWUST.updateAlumniProfile(user, {
                phone: alumniProfileForm.elements.phone.value.trim(),
                employmentStatus: alumniProfileForm.elements.employmentStatus.value.trim(),
                professionalLinks: alumniProfileForm.elements.professionalLinks.value.trim()
            });

            if (!updatedAlumnus) {
                if (alumniMessage) {
                    alumniMessage.textContent = "Your alumni profile could not be saved. Check the details and try again.";
                    alumniMessage.className = "form-help text-error";
                }
                return;
            }

            if (alumniMessage) {
                alumniMessage.textContent = "Your alumni profile has been updated.";
                alumniMessage.className = "form-help text-success";
            }

            window.dispatchEvent(new CustomEvent("kwust:state-changed"));
        });
    }

    var requestForm = document.getElementById("requestForm");

    if (requestForm && validation) {
        requestForm.addEventListener("submit", function (event) {
            event.preventDefault();

            if (!validation.validateForm(requestForm)) {
                return;
            }

            var user = window.KWUST.getCurrentUser();
            var fileInput = document.getElementById("requestFile");
            var file = fileInput && fileInput.files[0];
            var request = window.KWUST.addRequest(user, {
                type: requestForm.elements.requestType.value,
                details: requestForm.elements.requestDetails.value.trim(),
                fileName: file ? file.name : "",
                fileType: file ? file.type : "",
                fileSize: file ? file.size : 0,
                file: file
            });
            var requestMessage = document.getElementById("requestMessage");

            if (!request) {
                if (requestMessage) {
                    requestMessage.textContent = "The request could not be saved. Check the details and file, then try again.";
                    requestMessage.className = "form-help text-error";
                }
                return;
            }

            if (requestMessage) {
                requestMessage.textContent = "Your clearance request has been saved in the records queue.";
                requestMessage.className = "form-help text-success";
            }

            if (file) {
                window.KWUST.saveRequestFile(user, request.id, file).then(function () {
                    var markedStored = window.KWUST.markRequestFileStored(user, request.id, true);

                    if (!markedStored && requestMessage) {
                        requestMessage.textContent = "The request was saved, but its file status could not be updated in this browser.";
                        requestMessage.className = "form-help text-error";
                    }

                    window.dispatchEvent(new CustomEvent("kwust:state-changed"));
                }).catch(function () {
                    if (requestMessage) {
                        requestMessage.textContent = "The request was saved, but the supporting document could not be stored in this browser.";
                        requestMessage.className = "form-help text-error";
                    }
                });
            }

            window.dispatchEvent(new CustomEvent("clearance:request-added"));
            window.setTimeout(function () {
                if (window.KWUSTClearance) {
                    window.KWUSTClearance.closeModal();
                } else {
                    var requestModal = document.getElementById("requestModal");

                    if (requestModal) {
                        requestModal.classList.remove("show");
                        requestModal.setAttribute("aria-hidden", "true");
                        document.body.style.overflow = "";
                    }
                }
            }, 450);
            requestForm.reset();

            if (validation) {
                validation.clearErrors(requestForm);
            }
        });
    }

    var fileInputs = document.querySelectorAll("input[type='file']");

    fileInputs.forEach(function (input) {
        input.addEventListener("change", function () {
            var fileName = input.parentElement.querySelector(".file-name");

            if (fileName) {
                fileName.textContent = input.files.length > 0 ? input.files[0].name : "";
            }
        });
    });
});
