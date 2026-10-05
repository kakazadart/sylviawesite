/* Role-based demo authentication and session timeout */
(function (window) {
    "use strict";

    var PASSWORD_KEY = "kwust-clear-path-passwords-v1";
    var REGISTERED_ACCOUNTS_KEY = "kwust-clear-path-registered-accounts-v1";
    var PENDING_VERIFICATION_KEY = "kwust-clear-path-pending-verification-v1";
    var SESSION_KEY = "kwust-clear-path-session-v1";
    var WARNING_TIME = 2 * 60 * 1000;
    var warningTimer = null;
    var logoutTimer = null;

    var accounts = [
        {
            identifier: "KUM-24-0187",
            password: "student123",
            role: "student",
            name: "Akosua Mensah",
            securityAnswer: "Kiriri"
        },
        {
            identifier: "LIB-STAFF-01",
            password: "staff123",
            role: "department",
            name: "Library Clearance Officer",
            department: "library",
            securityAnswer: "Library"
        },
        {
            identifier: "FIN-STAFF-01",
            password: "staff123",
            role: "department",
            name: "Finance Clearance Officer",
            department: "finance",
            securityAnswer: "Finance"
        },
        {
            identifier: "CS-STAFF-01",
            password: "staff123",
            role: "department",
            name: "Department Head Officer",
            department: "departmentHead",
            securityAnswer: "Department Head"
        },
        {
            identifier: "HOST-STAFF-01",
            password: "staff123",
            role: "department",
            name: "Hostels Clearance Officer",
            department: "hostels",
            securityAnswer: "Hostels"
        },
        {
            identifier: "SUPER-001",
            password: "admin123",
            role: "super",
            name: "System Administrator",
            securityAnswer: "Super Admin"
        },
        {
            identifier: "KUM-24-0214",
            password: "alumni123",
            role: "alumni",
            name: "Kwame Boateng",
            securityAnswer: "Mechanical Engineering"
        }
    ];

    function normalizeIdentifier(identifier) {
        return String(identifier || "").trim().toUpperCase();
    }

    function containsUnsafeText(value) {
        return /[\u0000-\u001f<>]/.test(value);
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function isValidPhone(value) {
        return /^[+0-9()\-\s]{7,30}$/.test(value);
    }

    function apiRequest(path, payload) {
        if (typeof window.fetch !== "function") {
            return Promise.reject(new Error("The secure account service is not available in this browser."));
        }

        return window.fetch(path, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        }).then(function (response) {
            return response.text().then(function (body) {
                var data = {};

                try {
                    data = body ? JSON.parse(body) : {};
                } catch (error) {
                    throw new Error("The account service returned an invalid response.");
                }

                if (!response.ok || !data.success) {
                    var requestError = new Error(data.message || "The account request could not be completed.");
                    requestError.code = data.code || "request_failed";
                    requestError.fields = data.fields || {};
                    throw requestError;
                }

                return data;
            });
        });
    }

    function readPendingVerification() {
        try {
            var pending = JSON.parse(window.sessionStorage.getItem(PENDING_VERIFICATION_KEY) || "null");
            var identifier = normalizeIdentifier(pending && pending.identifier);
            var email = String(pending && pending.email || "").trim().toLowerCase();

            if (!/^[A-Z0-9-]{4,40}$/.test(identifier) || (email && !isValidEmail(email))) {
                clearPendingVerification();
                return null;
            }

            return {
                identifier: identifier,
                email: email
            };
        } catch (error) {
            clearPendingVerification();
            return null;
        }
    }

    function savePendingVerification(identifier, email) {
        try {
            window.sessionStorage.setItem(PENDING_VERIFICATION_KEY, JSON.stringify({
                identifier: normalizeIdentifier(identifier),
                email: String(email || "").trim().toLowerCase()
            }));
            return true;
        } catch (error) {
            return false;
        }
    }

    function clearPendingVerification() {
        try {
            window.sessionStorage.removeItem(PENDING_VERIFICATION_KEY);
        } catch (error) {
        }
    }

    function maskEmail(email) {
        var parts = String(email || "").split("@");

        if (parts.length !== 2 || !parts[1]) {
            return "your email address";
        }

        return parts[0].slice(0, 1) + "***@" + parts[1];
    }

    function setButtonBusy(button, busy, busyText, idleText) {
        if (!button) {
            return;
        }

        button.disabled = busy;

        if (busy) {
            button.setAttribute("data-idle-text", idleText);
            button.textContent = busyText;
        } else {
            button.textContent = button.getAttribute("data-idle-text") || idleText;
            button.removeAttribute("data-idle-text");
        }
    }

    function setRegistrationFieldErrors(form, fields) {
        var validation = window.formValidation;

        if (!validation || !validation.setError) {
            return;
        }

        var fieldMap = {
            identifier: "registerIdentifier",
            name: "registerFullName",
            email: "registerEmail",
            phone: "registerPhone",
            degree: "registerDegree",
            graduationYear: "registerGraduationYear",
            password: "registerPassword",
            securityAnswer: "registerSecurityAnswer"
        };

        Object.keys(fields || {}).forEach(function (field) {
            if (fieldMap[field]) {
                validation.setError(form, fieldMap[field], fields[field]);
            }
        });
    }

    function readRegisteredAccounts() {
        try {
            var stored = JSON.parse(window.localStorage.getItem(REGISTERED_ACCOUNTS_KEY) || "{}");
            return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
        } catch (error) {
            return {};
        }
    }

    function getRegisteredAccount(identifier) {
        var normalizedIdentifier = normalizeIdentifier(identifier);
        var account = readRegisteredAccounts()[normalizedIdentifier];

        if (!account || account.role !== "student" || typeof account.name !== "string" || !account.name || account.name.length > 120 || containsUnsafeText(account.name) || typeof account.securityAnswer !== "string" || !account.securityAnswer || account.securityAnswer.length > 100 || containsUnsafeText(account.securityAnswer)) {
            return null;
        }

        return {
            identifier: normalizedIdentifier,
            password: "",
            role: "student",
            name: account.name,
            securityAnswer: account.securityAnswer,
            department: ""
        };
    }

    function saveRegisteredAccount(account) {
        var normalizedIdentifier = normalizeIdentifier(account.identifier);
        var registeredAccounts = readRegisteredAccounts();

        registeredAccounts[normalizedIdentifier] = {
            identifier: normalizedIdentifier,
            role: "student",
            name: String(account.name),
            securityAnswer: String(account.securityAnswer)
        };

        try {
            window.localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(registeredAccounts));
        } catch (error) {
            return false;
        }

        return true;
    }

    function removeRegisteredAccount(identifier) {
        var normalizedIdentifier = normalizeIdentifier(identifier);
        var registeredAccounts = readRegisteredAccounts();

        if (!Object.prototype.hasOwnProperty.call(registeredAccounts, normalizedIdentifier)) {
            return true;
        }

        delete registeredAccounts[normalizedIdentifier];

        try {
            window.localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(registeredAccounts));
        } catch (error) {
            return false;
        }

        return true;
    }

    function clearRegisteredAccounts() {
        try {
            window.localStorage.removeItem(REGISTERED_ACCOUNTS_KEY);
            return true;
        } catch (error) {
            return false;
        }
    }

    function removePasswordOverride(identifier) {
        var normalizedIdentifier = normalizeIdentifier(identifier);
        var overrides = readPasswordOverrides();

        if (!Object.prototype.hasOwnProperty.call(overrides, normalizedIdentifier)) {
            return true;
        }

        delete overrides[normalizedIdentifier];

        try {
            window.localStorage.setItem(PASSWORD_KEY, JSON.stringify(overrides));
        } catch (error) {
            return false;
        }

        return true;
    }

    function readPasswordOverrides() {
        try {
            var overrides = JSON.parse(window.localStorage.getItem(PASSWORD_KEY) || "{}");
            return overrides && typeof overrides === "object" && !Array.isArray(overrides) ? overrides : {};
        } catch (error) {
            return {};
        }
    }

    function getAccount(identifier) {
        var normalizedIdentifier = normalizeIdentifier(identifier);
        var registeredAccount = getRegisteredAccount(normalizedIdentifier);

        if (registeredAccount) {
            if (window.KWUST && window.KWUST.getStudent) {
                var student = window.KWUST.getStudent(normalizedIdentifier);

                if (!student || student.status !== "active") {
                    return null;
                }

                registeredAccount.name = student.name;
            }

            return registeredAccount;
        }

        for (var index = 0; index < accounts.length; index += 1) {
            if (accounts[index].identifier === normalizedIdentifier) {
                return accounts[index];
            }
        }

        return null;
    }

    function getAccountPassword(account) {
        var overrides = readPasswordOverrides();
        return overrides[account.identifier] || account.password;
    }

    function savePasswordOverride(identifier, password) {
        var overrides = readPasswordOverrides();
        overrides[normalizeIdentifier(identifier)] = password;

        try {
            window.localStorage.setItem(PASSWORD_KEY, JSON.stringify(overrides));
        } catch (error) {
            return false;
        }

        return true;
    }

    function clearPasswordOverrides() {
        try {
            window.localStorage.removeItem(PASSWORD_KEY);
            return true;
        } catch (error) {
            return false;
        }
    }

    function roleLabel(role) {
        if (role === "department") {
            return "Department Admin";
        }

        if (role === "super") {
            return "Super Admin";
        }

        if (role === "alumni") {
            return "Alumni";
        }

        return "Student";
    }

    function redirectForRole(role) {
        if (role === "student") {
            return "dashboard.html";
        }

        if (role === "alumni") {
            return "alumni.html";
        }

        return "admin.html";
    }

    function isPageAllowed(page, user) {
        if (page === "student") {
            return user.role === "student";
        }

        if (page === "admin") {
            return user.role === "department" || user.role === "super";
        }

        if (page === "alumni") {
            return user.role === "alumni" || user.role === "student";
        }

        if (page === "certificate") {
            return user.role === "student" || user.role === "alumni";
        }

        return true;
    }

    /* After signing in, a student may be returned to a page of this site only,
       so a crafted link can never bounce them to another host. Each entry maps
       a file name to the page key isPageAllowed() understands. */
    var NEXT_PAGE_KEYS = {
        "dashboard.html": "student",
        "payments.html": "student",
        "certificates.html": "certificate",
        "alumni.html": "alumni",
        "admin.html": "admin"
    };

    function readQueryParameter(name) {
        var query = String(window.location.search || "").replace(/^\?/, "");

        if (!query) {
            return "";
        }

        var pairs = query.split("&");

        for (var index = 0; index < pairs.length; index += 1) {
            var parts = pairs[index].split("=");

            if (decodeURIComponent(parts[0] || "") === name) {
                return decodeURIComponent(String(parts[1] || "").replace(/\+/g, " "));
            }
        }

        return "";
    }

    function isKnownPage(page) {
        var path = String(page || "").split("#")[0].toLowerCase();

        return Object.prototype.hasOwnProperty.call(NEXT_PAGE_KEYS, path);
    }

    function nextPageFor(user) {
        var requested = readQueryParameter("next");

        if (!isKnownPage(requested)) {
            return "";
        }

        return isPageAllowed(NEXT_PAGE_KEYS[requested.split("#")[0].toLowerCase()], user) ? requested : "";
    }

    /* Signing in from a guarded page returns the student to it, so a "Pay now"
       click is not lost at the login screen. */
    function loginUrl() {
        var path = String(window.location.pathname || "").split(/[\\\/]/).pop();
        var current = path + String(window.location.hash || "");

        if (!isKnownPage(current)) {
            return "login.html";
        }

        return "login.html?next=" + encodeURIComponent(current);
    }

    function showSessionWarning() {
        var warning = document.getElementById("sessionWarning");

        if (warning) {
            warning.hidden = false;
            warning.textContent = "Your session will end soon because of inactivity.";
        }
    }

    function clearSessionWarning() {
        var warning = document.getElementById("sessionWarning");

        if (warning) {
            warning.hidden = true;
        }
    }

    function logout() {
        if (window.KWUST) {
            window.KWUST.clearSession();
        }

        window.location.href = "login.html";
    }

    function scheduleSessionTimers() {
        window.clearTimeout(warningTimer);
        window.clearTimeout(logoutTimer);
        warningTimer = window.setTimeout(showSessionWarning, window.KWUST.SESSION_TIMEOUT - WARNING_TIME);
        logoutTimer = window.setTimeout(logout, window.KWUST.SESSION_TIMEOUT);
    }

    function registerSessionActivity() {
        var activityEvents = ["click", "keydown", "scroll", "touchstart"];

        activityEvents.forEach(function (eventName) {
            document.addEventListener(eventName, function () {
                if (window.KWUST.getCurrentUser()) {
                    window.KWUST.touchSession();
                    clearSessionWarning();
                    scheduleSessionTimers();
                }
            }, { passive: true });
        });

        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState !== "visible") {
                return;
            }

            if (!window.KWUST.getCurrentUser()) {
                if (document.body.getAttribute("data-protected-page")) {
                    window.location.href = "login.html";
                }
                return;
            }

            window.KWUST.touchSession();
            scheduleSessionTimers();
        });
    }

    function syncSessionAcrossTabs(event) {
        var page = document.body.getAttribute("data-protected-page");

        if (event.key !== SESSION_KEY || !page || !window.KWUST) {
            return;
        }

        var user = window.KWUST.getCurrentUser();

        if (!user) {
            window.location.href = "login.html";
            return;
        }

        if (!isPageAllowed(page, user)) {
            window.location.href = redirectForRole(user.role);
        }
    }

    function protectPage() {
        var page = document.body.getAttribute("data-protected-page");

        if (!page || !window.KWUST) {
            return;
        }

        var user = window.KWUST.getCurrentUser();

        if (!user) {
            window.location.href = loginUrl();
            return;
        }

        if (!isPageAllowed(page, user)) {
            window.location.href = redirectForRole(user.role);
            return;
        }

        if (!window.KWUST.touchSession()) {
            window.location.href = loginUrl();
            return;
        }

        registerSessionActivity();
        scheduleSessionTimers();
    }

    function updateIdentifierLabel() {
        var roleSelect = document.getElementById("loginRole");
        var identifierLabel = document.getElementById("identifierLabel");
        var identifierInput = document.getElementById("identifier");

        if (!roleSelect || !identifierLabel || !identifierInput) {
            return;
        }

        if (roleSelect.value === "student" || roleSelect.value === "alumni") {
            identifierLabel.textContent = "Registration number";
            identifierInput.placeholder = "Enter your registration number";
        } else {
            identifierLabel.textContent = "Staff ID";
            identifierInput.placeholder = "Enter your staff ID";
        }
    }

    function setLoginMessage(message, type) {
        var messageElement = document.getElementById("loginMessage");

        if (!messageElement) {
            return;
        }

        messageElement.textContent = message;
        messageElement.className = "form-help " + (type === "error" ? "text-error" : "text-success");
    }

    function authenticate(identifier, password, role) {
        var account = getAccount(identifier);
        var expectedPassword = account ? getAccountPassword(account) : "";

        if (!account || account.role !== role || expectedPassword !== password) {
            return null;
        }

        return {
            identifier: account.identifier,
            role: account.role,
            name: account.name,
            department: account.department || ""
        };
    }

    function prepareUserForSession(user) {
        if (!user || typeof user.identifier !== "string" || typeof user.name !== "string" || ["student", "department", "super", "alumni"].indexOf(user.role) === -1) {
            return null;
        }

        if (user.role === "student" && user.profile && window.KWUST && window.KWUST.getStudent && window.KWUST.registerStudent && !window.KWUST.getStudent(user.identifier)) {
            if (!window.KWUST.registerStudent({
                identifier: user.identifier,
                name: user.profile.name,
                email: user.profile.email,
                phone: user.profile.phone,
                degree: user.profile.degree,
                graduationYear: user.profile.graduationYear
            })) {
                return null;
            }
        }

        return {
            identifier: normalizeIdentifier(user.identifier),
            role: user.role,
            name: user.name,
            department: user.department || ""
        };
    }

    function completeLogin(user, remember, submitButton) {
        var sessionUser = prepareUserForSession(user);

        if (!sessionUser) {
            setButtonBusy(submitButton, false, "Signing in...", "Sign in securely");
            setLoginMessage("The account details could not be prepared in this browser.", "error");
            return;
        }

        setLoginMessage("Identity verified. Opening your workspace...", "success");

        if (!window.KWUST.setSession(sessionUser, remember)) {
            setButtonBusy(submitButton, false, "Signing in...", "Sign in securely");
            setLoginMessage("Your session could not be saved in this browser.", "error");
            return;
        }

        var nextPage = nextPageFor(sessionUser);

        window.setTimeout(function () {
            window.location.href = nextPage || redirectForRole(sessionUser.role);
        }, 350);
    }

    function registerAccount(details) {
        var identifier = normalizeIdentifier(details && details.identifier);
        var name = String(details && details.name || "").trim();
        var email = String(details && details.email || "").trim();
        var phone = String(details && details.phone || "").trim();
        var degree = String(details && details.degree || "").trim();
        var graduationYear = Number(details && details.graduationYear);
        var password = String(details && details.password || "");
        var securityAnswer = String(details && details.securityAnswer || "").trim();
        var currentYear = new Date().getFullYear();

        if (!/^[A-Z0-9-]{4,40}$/.test(identifier)) {
            return { error: "Use 4 to 40 letters, numbers, or hyphens for the registration number." };
        }

        if (name.length < 2 || name.length > 120 || containsUnsafeText(name)) {
            return { error: "Enter a full name between 2 and 120 characters." };
        }

        if (email.length > 120 || !isValidEmail(email)) {
            return { error: "Enter a valid email address." };
        }

        if (phone && !isValidPhone(phone)) {
            return { error: "Enter a valid phone number or leave the field blank." };
        }

        if (!degree || degree.length > 100 || containsUnsafeText(degree)) {
            return { error: "Choose a programme." };
        }

        if (!isFinite(graduationYear) || graduationYear % 1 !== 0 || graduationYear < 2000 || graduationYear > currentYear + 10) {
            return { error: "Enter a valid graduation year." };
        }

        if (password.length < 6 || password.length > 128 || containsUnsafeText(password)) {
            return { error: "Use a password between 6 and 128 characters." };
        }

        if (securityAnswer.length < 2 || securityAnswer.length > 100 || containsUnsafeText(securityAnswer)) {
            return { error: "Enter a security answer between 2 and 100 characters." };
        }

        if (!window.KWUST || !window.KWUST.registerStudent || !window.KWUST.getStudent) {
            return { error: "Registration is unavailable in this browser." };
        }

        if (getAccount(identifier) || window.KWUST.getStudent(identifier)) {
            return { error: "An account with that registration number already exists." };
        }

        if (!saveRegisteredAccount({
            identifier: identifier,
            name: name,
            securityAnswer: securityAnswer
        })) {
            return { error: "The account could not be saved in this browser." };
        }

        if (!savePasswordOverride(identifier, password)) {
            removeRegisteredAccount(identifier);
            return { error: "The account password could not be saved in this browser." };
        }

        var student = window.KWUST.registerStudent({
            identifier: identifier,
            name: name,
            email: email,
            phone: phone,
            degree: degree,
            graduationYear: graduationYear
        });

        if (!student) {
            removePasswordOverride(identifier);
            removeRegisteredAccount(identifier);
            return { error: "The student profile could not be created." };
        }

        return {
            account: {
                identifier: identifier,
                role: "student",
                name: name,
                department: ""
            },
            student: student
        };
    }

    function handleLogin(event) {
        event.preventDefault();
        var form = event.currentTarget;
        var validation = window.formValidation;

        if (!validation.validateForm(form)) {
            setLoginMessage("Check the highlighted fields and try again.", "error");
            return;
        }

        var identifier = normalizeIdentifier(form.elements.identifier.value);
        var password = form.elements.password.value;
        var role = form.elements.loginRole.value;
        var remember = form.elements.rememberStudent.checked;
        var submitButton = form.querySelector("button[type='submit']");
        var localUser = authenticate(identifier, password, role);

        if (localUser) {
            completeLogin(localUser, remember, submitButton);
            return;
        }

        if (role !== "student") {
            setLoginMessage("Those credentials do not match the selected role.", "error");
            return;
        }

        setButtonBusy(submitButton, true, "Signing in...", "Sign in securely");
        setLoginMessage("Checking your secure student account...", "success");

        apiRequest("api/login.php", {
            identifier: identifier,
            password: password,
            role: role
        }).then(function (data) {
            completeLogin(data.user, remember, submitButton);
        }).catch(function (error) {
            setButtonBusy(submitButton, false, "Signing in...", "Sign in securely");

            if (error.code === "not_verified") {
                var pending = readPendingVerification();

                if (!pending || pending.identifier !== identifier) {
                    pending = {
                        identifier: identifier,
                        email: ""
                    };
                    savePendingVerification(identifier, "");
                }

                showVerification(true, pending);
                setVerifyMessage(error.message || "Verify your email before signing in.", "error");
                return;
            }

            if (error.code === "invalid_credentials" || error.code === "account_not_found") {
                setLoginMessage("Those credentials do not match the selected role.", "error");
                return;
            }

            setLoginMessage("The secure sign-in service is unavailable. Try again shortly.", "error");
        });
    }

    function setResetMessage(message, type) {
        var messageElement = document.getElementById("resetMessage");

        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = "form-help " + (type === "error" ? "text-error" : "text-success");
        }
    }

    function handleReset(event) {
        event.preventDefault();
        var form = event.currentTarget;
        var validation = window.formValidation;

        if (!validation.validateForm(form)) {
            return;
        }

        var identifier = normalizeIdentifier(form.elements.resetIdentifier.value);
        var answer = form.elements.securityAnswer.value.trim();
        var newPassword = form.elements.newPassword.value;
        var account = getAccount(identifier);
        var expectedAnswer = account ? account.securityAnswer.toLowerCase() : "";

        if (account) {
            if (expectedAnswer !== answer.toLowerCase()) {
                setResetMessage("The security answer could not be verified.", "error");
                return;
            }

            if (!savePasswordOverride(identifier, newPassword)) {
                setResetMessage("The password could not be saved in this browser.", "error");
                return;
            }

            setResetMessage("Password updated. You can now sign in with the new password.", "success");
            form.reset();
            validation.clearErrors(form);
            return;
        }

        var submitButton = form.querySelector("button[type='submit']");
        setButtonBusy(submitButton, true, "Updating...", "Update password");
        setResetMessage("Resetting your secure account password...", "success");

        apiRequest("api/reset-password.php", {
            identifier: identifier,
            securityAnswer: answer,
            newPassword: newPassword
        }).then(function (data) {
            setButtonBusy(submitButton, false, "Updating...", "Update password");
            setResetMessage(data.message || "Password updated. You can now sign in with the new password.", "success");
            form.reset();
            validation.clearErrors(form);
        }).catch(function (error) {
            setButtonBusy(submitButton, false, "Updating...", "Update password");

            if (error.code === "invalid_security_answer" || error.code === "invalid_request") {
                setResetMessage(error.message || "The security answer could not be verified.", "error");
                return;
            }

            setResetMessage("The secure password reset service is unavailable. Try again shortly.", "error");
        });
    }

    function setRegisterMessage(message, type) {
        var messageElement = document.getElementById("registerMessage");

        if (!messageElement) {
            return;
        }

        messageElement.textContent = message;
        messageElement.className = "form-help " + (type === "error" ? "text-error" : "text-success");
    }

    function setVerifyMessage(message, type) {
        var messageElement = document.getElementById("verifyMessage");

        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = "form-help " + (type === "error" ? "text-error" : "text-success");
        }
    }

    function otpInputs(form) {
        if (!form) {
            return [];
        }

        return Array.prototype.slice.call(form.querySelectorAll(".otp-input"));
    }

    function readOtpCode(form) {
        return otpInputs(form).map(function (input) {
            return input.value.trim();
        }).join("");
    }

    function syncOtpCode(form) {
        var hiddenInput = form ? form.elements.code : null;

        if (hiddenInput) {
            hiddenInput.value = readOtpCode(form);
        }

        return hiddenInput ? hiddenInput.value : "";
    }

    function clearOtpCode(form) {
        otpInputs(form).forEach(function (input) {
            input.value = "";
        });

        syncOtpCode(form);
    }

    function focusOtpInput(form, index) {
        var inputs = otpInputs(form);
        var target = inputs[index] || inputs[inputs.length - 1];

        if (target) {
            target.focus();
            target.select();
        }
    }

    function attachOtpInputs(form) {
        var inputs = otpInputs(form);

        if (!inputs.length) {
            return;
        }

        inputs.forEach(function (input, index) {
            input.addEventListener("input", function () {
                var digits = input.value.replace(/\D/g, "");

                if (!digits) {
                    input.value = "";
                    syncOtpCode(form);
                    return;
                }

                input.value = digits.charAt(0);

                if (digits.length > 1) {
                    writeOtpDigits(form, digits, index);
                } else {
                    syncOtpCode(form);

                    if (index < inputs.length - 1) {
                        focusOtpInput(form, index + 1);
                    }
                }
            });

            input.addEventListener("keydown", function (event) {
                if (event.key === "Backspace" && input.value === "" && index > 0) {
                    event.preventDefault();
                    otpInputs(form)[index - 1].value = "";
                    focusOtpInput(form, index - 1);
                } else if (event.key === "ArrowLeft" && index > 0) {
                    event.preventDefault();
                    focusOtpInput(form, index - 1);
                } else if (event.key === "ArrowRight" && index < inputs.length - 1) {
                    event.preventDefault();
                    focusOtpInput(form, index + 1);
                }
            });

            input.addEventListener("focus", function () {
                input.select();
            });

            input.addEventListener("paste", function (event) {
                event.preventDefault();
                var pasted = (event.clipboardData || window.clipboardData).getData("text") || "";
                writeOtpDigits(form, pasted.replace(/\D/g, ""), index);
            });
        });
    }

    function writeOtpDigits(form, digits, startIndex) {
        var inputs = otpInputs(form);
        var offset = 0;

        inputs.forEach(function (input) {
            input.value = "";
        });

        for (var position = 0; position < digits.length; position += 1) {
            offset = startIndex + position;

            if (offset >= inputs.length) {
                break;
            }

            inputs[offset].value = digits.charAt(position);
        }

        syncOtpCode(form);
        focusOtpInput(form, Math.min(offset + 1, inputs.length - 1));
    }

    function showVerification(show, pending) {
        var loginForm = document.getElementById("loginForm");
        var registerPanel = document.getElementById("registerPanel");
        var verifyPanel = document.getElementById("verifyPanel");
        var authSwitch = document.getElementById("authSwitch");
        var registerToggle = document.getElementById("registerToggle");
        var resetToggle = document.getElementById("resetToggle");
        var resetPanel = document.getElementById("resetPanel");
        var demoAccounts = document.querySelector(".demo-accounts");
        var title = document.querySelector(".login-title");
        var subtitle = document.querySelector(".login-subtitle");

        if (!loginForm || !registerPanel || !verifyPanel) {
            return;
        }

        var details = pending || readPendingVerification();

        if (details && details.identifier) {
            var identifierInput = document.getElementById("verifyIdentifier");

            if (identifierInput) {
                identifierInput.value = normalizeIdentifier(details.identifier);
            }

            var description = document.getElementById("verifyDescription");

            if (description) {
                description.textContent = "Enter the 6-digit code sent to " + maskEmail(details.email) + ".";
            }
        }

        loginForm.hidden = show;
        registerPanel.hidden = true;
        verifyPanel.hidden = !show;

        if (authSwitch) {
            authSwitch.hidden = show;
        }

        if (registerToggle) {
            registerToggle.setAttribute("aria-expanded", "false");
        }

        if (resetToggle) {
            resetToggle.hidden = show;
        }

        if (resetPanel) {
            resetPanel.hidden = true;
        }

        if (demoAccounts) {
            demoAccounts.hidden = show;
        }

        if (title) {
            title.textContent = show ? "Verify your account" : "Welcome back";
        }

        if (subtitle) {
            subtitle.textContent = show ? "Use the verification code sent to your email." : "Choose your role and sign in to continue.";
        }

        if (show) {
            var verifyForm = document.getElementById("verifyForm");
            var codeInput = document.getElementById("verificationCode");

            if (codeInput) {
                codeInput.value = "";
            }

            clearOtpCode(verifyForm);
            focusOtpInput(verifyForm, 0);

            if (verifyForm && window.formValidation) {
                window.formValidation.clearErrors(verifyForm);
            }
        }
    }

    function showRegistration(show) {
        var loginForm = document.getElementById("loginForm");
        var registerPanel = document.getElementById("registerPanel");
        var verifyPanel = document.getElementById("verifyPanel");
        var demoAccounts = document.querySelector(".demo-accounts");
        var authSwitch = document.getElementById("authSwitch");
        var registerToggle = document.getElementById("registerToggle");
        var resetToggle = document.getElementById("resetToggle");
        var resetPanel = document.getElementById("resetPanel");
        var title = document.querySelector(".login-title");
        var subtitle = document.querySelector(".login-subtitle");

        if (!loginForm || !registerPanel) {
            return;
        }

        loginForm.hidden = show;
        registerPanel.hidden = !show;

        if (verifyPanel) {
            verifyPanel.hidden = true;
        }

        if (demoAccounts) {
            demoAccounts.hidden = false;
        }

        if (authSwitch) {
            authSwitch.hidden = show;
        }

        if (registerToggle) {
            registerToggle.setAttribute("aria-expanded", String(show));
        }

        if (resetToggle) {
            resetToggle.hidden = show;

            if (!show) {
                resetToggle.textContent = "Forgot your password?";
            }
        }

        if (resetPanel) {
            resetPanel.hidden = true;
        }

        if (title) {
            title.textContent = show ? "Create your account" : "Welcome back";
        }

        if (subtitle) {
            subtitle.textContent = show ? "Register as a student to continue." : "Choose your role and sign in to continue.";
        }

        var focusField = document.getElementById(show ? "registerFullName" : "loginRole");

        if (focusField) {
            focusField.focus();
        }
    }

    function handleRegister(event) {
        event.preventDefault();
        var form = event.currentTarget;
        var validation = window.formValidation;

        if (!validation.validateForm(form)) {
            setRegisterMessage("Check the highlighted fields and try again.", "error");
            return;
        }

        var identifier = normalizeIdentifier(form.elements.registerIdentifier.value);
        var email = form.elements.registerEmail.value.trim().toLowerCase();

        if (getAccount(identifier) || window.KWUST.getStudent(identifier)) {
            setRegisterMessage("An account with that registration number already exists.", "error");
            return;
        }

        var submitButton = form.querySelector("button[type='submit']");
        setButtonBusy(submitButton, true, "Creating account...", "Create account");
        setRegisterMessage("Creating your account and sending the verification code...", "success");
        validation.clearErrors(form);

        apiRequest("api/register.php", {
            identifier: identifier,
            name: form.elements.registerFullName.value,
            email: email,
            phone: form.elements.registerPhone.value,
            degree: form.elements.registerDegree.value,
            graduationYear: form.elements.registerGraduationYear.value,
            password: form.elements.registerPassword.value,
            securityAnswer: form.elements.registerSecurityAnswer.value
        }).then(function (data) {
            setButtonBusy(submitButton, false, "Creating account...", "Create account");
            savePendingVerification(data.identifier || identifier, data.email || email);
            form.reset();
            validation.clearErrors(form);
            showVerification(true, {
                identifier: data.identifier || identifier,
                email: data.email || email
            });

            if (data.debugCode) {
                setVerifyMessage("Local test code: " + data.debugCode, "success");
            } else {
                setVerifyMessage("Verification code sent. It may take a few minutes to arrive.", "success");
            }
        }).catch(function (error) {
            setButtonBusy(submitButton, false, "Creating account...", "Create account");
            setRegistrationFieldErrors(form, error.fields);
            setRegisterMessage(error.message || "The account could not be created. Try again.", "error");
        });
    }

    function handleVerify(event) {
        event.preventDefault();
        var form = event.currentTarget;
        var validation = window.formValidation;
        var code = syncOtpCode(form).replace(/\s+/g, "");

        if (!validation.validateForm(form)) {
            setVerifyMessage("Enter the 6-digit verification code.", "error");
            return;
        }

        var identifier = normalizeIdentifier(form.elements.identifier.value);
        var submitButton = form.querySelector("button[type='submit']");

        if (!/^[0-9]{6}$/.test(code)) {
            setVerifyMessage("Enter the 6-digit verification code.", "error");
            focusOtpInput(form, 0);
            return;
        }

        setButtonBusy(submitButton, true, "Verifying...", "Verify account");
        setVerifyMessage("Checking your verification code...", "success");

        apiRequest("api/verify.php", {
            identifier: identifier,
            code: code
        }).then(function () {
            clearPendingVerification();
            setButtonBusy(submitButton, false, "Verifying...", "Verify account");
            form.reset();
            validation.clearErrors(form);

            var roleSelect = document.getElementById("loginRole");
            var identifierInput = document.getElementById("identifier");
            var passwordInput = document.getElementById("password");

            if (roleSelect) {
                roleSelect.value = "student";
                updateIdentifierLabel();
            }

            if (identifierInput) {
                identifierInput.value = identifier;
            }

            if (passwordInput) {
                passwordInput.value = "";
            }

            showRegistration(false);
            setLoginMessage("Email verified. Sign in to open your dashboard.", "success");

            if (passwordInput) {
                passwordInput.focus();
            }
        }).catch(function (error) {
            setButtonBusy(submitButton, false, "Verifying...", "Verify account");
            setVerifyMessage(error.message || "The verification code could not be confirmed.", "error");

            if (error.code === "code_expired" || error.code === "verification_conflict") {
                clearOtpCode(form);
                focusOtpInput(form, 0);
            }
        });
    }

    function handleResendCode() {
        var form = document.getElementById("verifyForm");
        var identifier = normalizeIdentifier(form && form.elements.identifier.value);
        var resendButton = document.getElementById("resendCode");

        if (!/^[A-Z0-9-]{4,40}$/.test(identifier)) {
            setVerifyMessage("The pending registration number is not valid. Register the account again.", "error");
            return;
        }

        setButtonBusy(resendButton, true, "Sending...", "Resend code");
        setVerifyMessage("Sending a new verification code...", "success");

        apiRequest("api/resend.php", {
            identifier: identifier
        }).then(function (data) {
            setButtonBusy(resendButton, false, "Sending...", "Resend code");

            if (data.debugCode) {
                setVerifyMessage("Local test code: " + data.debugCode, "success");
            } else {
                setVerifyMessage(data.message || "A new verification code has been sent.", "success");
            }
        }).catch(function (error) {
            setButtonBusy(resendButton, false, "Sending...", "Resend code");
            setVerifyMessage(error.message || "A new verification code could not be sent.", "error");
        });
    }

    function fillDemoAccount(identifier, role, password) {
        var roleSelect = document.getElementById("loginRole");
        var identifierInput = document.getElementById("identifier");
        var passwordInput = document.getElementById("password");

        if (roleSelect) {
            roleSelect.value = role;
            updateIdentifierLabel();
        }

        if (identifierInput) {
            identifierInput.value = identifier;
        }

        if (passwordInput) {
            passwordInput.value = password;
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (!window.KWUST) {
            return;
        }

        protectPage();
        window.addEventListener("storage", syncSessionAcrossTabs);
        updateIdentifierLabel();

        var pendingVerification = readPendingVerification();

        if (pendingVerification) {
            showVerification(true, pendingVerification);
        }

        var roleSelect = document.getElementById("loginRole");

        if (roleSelect) {
            roleSelect.addEventListener("change", updateIdentifierLabel);
        }

        var loginForm = document.getElementById("loginForm");

        if (loginForm) {
            loginForm.addEventListener("submit", handleLogin);
        }

        var registerToggle = document.getElementById("registerToggle");

        if (registerToggle) {
            registerToggle.addEventListener("click", function () {
                setRegisterMessage("", "success");
                setLoginMessage("", "success");
                showRegistration(true);
            });
        }

        var registerBack = document.getElementById("registerBack");

        if (registerBack) {
            registerBack.addEventListener("click", function () {
                setRegisterMessage("", "success");
                showRegistration(false);
            });
        }

        var registerForm = document.getElementById("registerForm");

        if (registerForm) {
            registerForm.addEventListener("submit", handleRegister);
        }

        var verifyForm = document.getElementById("verifyForm");

        if (verifyForm) {
            verifyForm.addEventListener("submit", handleVerify);
            attachOtpInputs(verifyForm);
        }

        var resendCode = document.getElementById("resendCode");

        if (resendCode) {
            resendCode.addEventListener("click", handleResendCode);
        }

        var verifyBack = document.getElementById("verifyBack");

        if (verifyBack) {
            verifyBack.addEventListener("click", function () {
                setVerifyMessage("", "success");
                showRegistration(false);
            });
        }

        var resetToggle = document.getElementById("resetToggle");

        if (resetToggle) {
            resetToggle.addEventListener("click", function () {
                var resetPanel = document.getElementById("resetPanel");

                if (resetPanel) {
                    resetPanel.hidden = !resetPanel.hidden;
                    resetToggle.textContent = resetPanel.hidden ? "Forgot your password?" : "Close password reset";
                }
            });
        }

        var resetForm = document.getElementById("resetForm");

        if (resetForm) {
            resetForm.addEventListener("submit", handleReset);
        }

        var demoButtons = document.querySelectorAll("[data-demo-account]");

        demoButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                fillDemoAccount(
                    button.getAttribute("data-demo-account"),
                    button.getAttribute("data-demo-role"),
                    button.getAttribute("data-demo-password")
                );
            });
        });

        var logoutButton = document.getElementById("logoutButton");

        if (logoutButton) {
            logoutButton.addEventListener("click", logout);
        }
    });

    window.KWUSTAuth = {
        getAccount: getAccount,
        registerAccount: registerAccount,
        roleLabel: roleLabel,
        redirectForRole: redirectForRole,
        logout: logout,
        clearPasswordOverrides: clearPasswordOverrides,
        clearRegisteredAccounts: clearRegisteredAccounts,
        accounts: accounts
    };
}(window));
