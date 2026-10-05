/* Fee balances, M-Pesa payment form, and payment history */
(function (window) {
    "use strict";

    var POLL_INTERVAL_MS = 3000;
    var POLL_ATTEMPTS = 20;
    var pollTimer = null;
    var latest = null;
    var lastFocusedElement = null;

    function escapeHtml(value) {
        return String(value === null || value === undefined ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function currentIdentifier() {
        if (!window.KWUST || typeof window.KWUST.getCurrentUser !== "function") {
            return "";
        }

        var user = window.KWUST.getCurrentUser();

        return user && user.identifier ? String(user.identifier) : "";
    }

    function request(path, payload) {
        if (typeof window.fetch !== "function") {
            return Promise.reject(new Error("This browser cannot reach the payment service."));
        }

        var options = {
            method: payload ? "POST" : "GET",
            credentials: "same-origin",
            headers: {
                "Accept": "application/json"
            }
        };

        if (payload) {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(payload);
        }

        return window.fetch(path, options).then(function (response) {
            return response.text().then(function (body) {
                var data = {};

                try {
                    data = body ? JSON.parse(body) : {};
                } catch (error) {
                    throw new Error("The payment service returned an invalid response.");
                }

                if (!response.ok || !data.success) {
                    var requestError = new Error(data.message || "The payment request could not be completed.");
                    requestError.code = data.code || "request_failed";

                    throw requestError;
                }

                return data;
            });
        });
    }

    function formatMoney(value) {
        var amount = Number(value);

        if (!isFinite(amount)) {
            return "KSh 0.00";
        }

        return "KSh " + amount.toLocaleString("en-KE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatDate(value) {
        if (!value) {
            return "";
        }

        var parsed = new Date(String(value).replace(" ", "T"));

        if (isNaN(parsed.getTime())) {
            return String(value);
        }

        return parsed.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function balanceStatusClass(status) {
        if (status === "settled") {
            return "status-cleared";
        }

        if (status === "partial") {
            return "status-review";
        }

        return "status-pending";
    }

    function balanceStatusText(balance) {
        if (balance.status === "settled") {
            return "Settled";
        }

        if (balance.status === "partial") {
            return "Part paid";
        }

        return "Outstanding";
    }

    function paymentStatusClass(status) {
        if (status === "completed") {
            return "status-cleared";
        }

        if (status === "pending") {
            return "status-pending";
        }

        return "status-rejected";
    }

    function paymentStatusText(status) {
        if (status === "completed") {
            return "Completed";
        }

        if (status === "pending") {
            return "Awaiting confirmation";
        }

        if (status === "rejected") {
            return "Not accepted";
        }

        return "Failed";
    }

    function setMessage(kind, text) {
        var messageElement = document.getElementById("paymentMessage");

        if (!messageElement) {
            return;
        }

        messageElement.textContent = text || "";
        messageElement.className = kind === "error" ? "payment-message is-error" : "payment-message";
    }

    function showNotice(id, visible) {
        var element = document.getElementById(id);

        if (element) {
            element.hidden = !visible;
        }
    }

    /* Statement loading happens outside the modal, so failures need a place of
       their own to be reported. */
    function setFeesMessage(text) {
        var messageElement = document.getElementById("feesMessage");

        if (!messageElement) {
            return;
        }

        messageElement.textContent = text || "";
        messageElement.className = text ? "payment-message is-error" : "payment-message";
    }

    /* A balance the portal cannot take money for is not the same as no balance
       at all, and saying so is more use than a dead button. */
    function nothingToPayMessage() {
        var mpesa = (latest && latest.mpesa) || {};
        var totals = (latest && latest.totals) || {};
        var outstanding = Number(totals.outstanding) || 0;

        if (outstanding <= 0) {
            return "There is nothing outstanding to pay right now. Press Refresh to check your statement again.";
        }

        var reason = mpesa.reason ? mpesa.reason : "Online payment is not available yet.";

        return reason + " You can still settle this at any M-Pesa agent using the paybill numbers on this page.";
    }

    function renderTotals(data) {
        var totals = data.totals || {};

        var dueElement = document.getElementById("totalDue");
        var paidElement = document.getElementById("totalPaid");
        var outstandingElement = document.getElementById("totalOutstanding");

        if (dueElement) {
            dueElement.textContent = formatMoney(totals.due);
        }

        if (paidElement) {
            paidElement.textContent = formatMoney(totals.paid);
        }

        if (outstandingElement) {
            outstandingElement.textContent = formatMoney(totals.outstanding);
        }
    }

    function canPay(balance) {
        return balance.payable === true && Number(balance.outstanding) > 0;
    }

    /* What the charge is for: tuition, textbooks, hostels and so on. The API
       sends friendly wording, and the category key is the fallback. */
    function purposeLabel(item) {
        var purpose = item && item.purpose ? String(item.purpose).trim() : "";

        if (purpose !== "") {
            return purpose;
        }

        var words = String(item && item.category ? item.category : "").replace(/[_-]+/g, " ").trim();

        if (words === "") {
            return "Other";
        }

        return words.charAt(0).toUpperCase() + words.slice(1);
    }

    function purposeBadge(item) {
        var category = String(item && item.category ? item.category : "other").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        var name = "fee-purpose";

        if (category !== "") {
            name += " fee-purpose-" + category;
        }

        return "<span class=\"" + name + "\">" + escapeHtml(purposeLabel(item)) + "</span>";
    }

    function balanceAction(balance) {
        if (!canPay(balance)) {
            return "<td><span class=\"table-secondary-text\">Not available</span></td>";
        }

        return "<td>" +
            "<div class=\"table-actions\">" +
            "<button class=\"button button-primary button-small pay-now-button\" type=\"button\" data-pay-fee=\"" + escapeHtml(balance.id) + "\">Pay now</button>" +
            "</div>" +
            "</td>";
    }

    function renderBalances(data) {
        var body = document.getElementById("balanceBody");
        var empty = document.getElementById("balanceEmpty");
        var balances = data.balances || [];

        if (!body) {
            return;
        }

        if (balances.length === 0) {
            body.innerHTML = "";
            showNotice("balanceEmpty", true);
            return;
        }

        showNotice("balanceEmpty", false);

        body.innerHTML = balances.map(function (balance) {
            var settledClass = balance.status === "settled" ? "settled" : "outstanding";
            var dueDate = balance.due_date && String(balance.due_date).indexOf("00:00") === -1
                ? "<span class=\"table-secondary-text\">Due " + escapeHtml(formatDate(balance.due_date)) + "</span>"
                : "";

            return "<tr>" +
                "<td>" +
                    "<strong>" + escapeHtml(balance.description || balance.category) + "</strong>" +
                    dueDate +
                "</td>" +
                "<td>" + purposeBadge(balance) + "</td>" +
                "<td>" + escapeHtml(formatMoney(balance.amount_due)) + "</td>" +
                "<td>" + escapeHtml(formatMoney(balance.amount_paid)) + "</td>" +
                "<td class=\"balance-amount " + settledClass + "\">" + escapeHtml(formatMoney(balance.outstanding)) + "</td>" +
                "<td><span class=\"" + balanceStatusClass(balance.status) + "\">" + escapeHtml(balanceStatusText(balance)) + "</span></td>" +
                balanceAction(balance) +
                "</tr>";
        }).join("");
    }

    function renderPayments(data) {
        var body = document.getElementById("paymentBody");
        var empty = document.getElementById("paymentEmpty");
        var payments = data.payments || [];

        if (!body) {
            return;
        }

        if (payments.length === 0) {
            body.innerHTML = "";
            showNotice("paymentEmpty", true);
            return;
        }

        showNotice("paymentEmpty", false);

        body.innerHTML = payments.map(function (payment) {
            var receipt = payment.mpesa_receipt
                ? "<span class=\"receipt-cell\">" + escapeHtml(payment.mpesa_receipt) + "</span>"
                : "<span class=\"table-secondary-text\">Not issued</span>";
            var note = payment.result_desc
                ? "<span class=\"payment-note\">" + escapeHtml(payment.result_desc) + "</span>"
                : "";

            return "<tr>" +
                "<td>" +
                    "<strong>" + escapeHtml(payment.description || payment.category) + "</strong>" +
                    note +
                "</td>" +
                "<td>" + purposeBadge(payment) + "</td>" +
                "<td>" + escapeHtml(formatMoney(payment.amount)) + "</td>" +
                "<td>" + receipt + "</td>" +
                "<td><span class=\"" + paymentStatusClass(payment.status) + "\">" + escapeHtml(paymentStatusText(payment.status)) + "</span></td>" +
                "<td>" + escapeHtml(formatDate(payment.created_at)) + "</td>" +
                "</tr>";
        }).join("");
    }

    function renderPaybills(data) {
        var container = document.getElementById("paybillList");
        var paybills = data.paybills || [];

        if (!container) {
            return;
        }

        container.innerHTML = paybills.map(function (paybill) {
            var configured = paybill.configured
                ? escapeHtml(paybill.paybill)
                : "<em>Not configured yet</em>";

            return "<div class=\"paybill-row\">" +
                "<dt>" + escapeHtml(paybill.label) + "</dt>" +
                "<dd class=\"paybill-number\">" + configured + "</dd>" +
                "</div>";
        }).join("");
    }

    function payableBalances(data) {
        return (data.balances || []).filter(canPay);
    }

    function populateFeeSelect(data) {
        var select = document.getElementById("feeSelect");

        if (!select) {
            return;
        }

        var options = payableBalances(data);
        var previous = select.value;

        select.innerHTML = '<option value="">Select a fee to pay</option>' + options.map(function (balance) {
            var name = purposeLabel(balance);
            var detail = String(balance.description || "").trim();

            if (detail !== "" && detail !== name) {
                name += " — " + detail;
            }

            return '<option value="' + escapeHtml(balance.id) + '">' +
                escapeHtml(name) + " — " +
                escapeHtml(formatMoney(balance.outstanding)) + " outstanding" +
                "</option>";
        }).join("");

        if (options.length === 0) {
            select.value = "";
            syncFeeSelection();
            return;
        }

        var stillThere = options.some(function (balance) {
            return String(balance.id) === String(previous);
        });

        select.value = stillThere ? previous : String(options[0].id);
        syncFeeSelection();
    }

    function selectedBalance() {
        var select = document.getElementById("feeSelect");

        if (!select || !latest) {
            return null;
        }

        var chosen = select.value;

        if (!chosen) {
            return null;
        }

        return (latest.balances || []).filter(function (balance) {
            return String(balance.id) === String(chosen);
        })[0] || null;
    }

    function syncFeeSelection() {
        var panel = document.getElementById("paybillDetail");
        var amountField = document.getElementById("amount");
        var paybillNumber = document.getElementById("selectedPaybill");
        var paybillAccount = document.getElementById("selectedAccount");
        var paybillName = document.getElementById("selectedAccountName");
        var paybillHint = document.getElementById("paybillHint");
        var purposeField = document.getElementById("selectedPurpose");
        var subtitle = document.getElementById("paymentModalSubtitle");
        var balance = selectedBalance();

        if (!balance) {
            showNotice("paybillDetail", false);

            if (subtitle) {
                subtitle.textContent = "Check the fee and amount, then confirm the prompt on your phone.";
            }

            return;
        }

        showNotice("paybillDetail", true);

        if (purposeField) {
            purposeField.textContent = purposeLabel(balance);
        }

        if (subtitle) {
            subtitle.textContent = "Paying " + purposeLabel(balance) + " — " +
                formatMoney(balance.outstanding) + " outstanding.";
        }

        if (paybillNumber) {
            paybillNumber.textContent = balance.paybill ? balance.paybill.paybill : "Not configured";
        }

        if (paybillAccount) {
            paybillAccount.textContent = balance.paybill ? balance.paybill.account_number : "";
        }

        if (paybillName) {
            paybillName.textContent = balance.paybill ? balance.paybill.account_name : "";
        }

        if (paybillHint) {
            paybillHint.hidden = !balance.paybill || balance.paybill.configured === true;
        }

        if (amountField && document.activeElement !== amountField) {
            amountField.value = Number(balance.outstanding).toFixed(2);
        }

        if (panel) {
            panel.setAttribute("data-category", balance.category);
        }
    }

    function paymentModal() {
        return document.getElementById("paymentModal");
    }

    function getFocusableElements(modal) {
        return Array.prototype.slice.call(modal.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]")).filter(function (element) {
            return element.offsetParent !== null;
        });
    }

    function balanceById(balanceId) {
        return payableBalances(latest || {}).filter(function (balance) {
            return String(balance.id) === String(balanceId);
        })[0] || null;
    }

    /* Without a fee of its own, the panel button pays the largest balance. */
    function largestPayable(balances) {
        return balances.slice().sort(function (first, second) {
            return Number(second.outstanding) - Number(first.outstanding);
        })[0] || null;
    }

    /* The form lives in a modal: nothing to type into until the student asks
       to pay, and the fee they picked arrives already selected. */
    function openPaymentModal(balanceId) {
        var modal = paymentModal();
        var select = document.getElementById("feeSelect");
        var form = document.getElementById("paymentForm");
        var options = payableBalances(latest || {});

        if (!modal) {
            return false;
        }

        var target = balanceId ? balanceById(balanceId) : largestPayable(options);

        if (!target) {
            return false;
        }

        lastFocusedElement = document.activeElement;
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        if (form && window.formValidation) {
            window.formValidation.clearErrors(form);
        }

        showNotice("pendingPrompt", false);
        showNotice("checkoutReferenceWrap", false);
        setMessage("", "");

        if (select) {
            select.value = String(target.id);
        }

        syncFeeSelection();
        updateFormAvailability();

        if (select) {
            select.focus();
        }

        return true;
    }

    function closePaymentModal() {
        var modal = paymentModal();

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

    function updateFormAvailability() {
        var submit = document.getElementById("submitPayment");
        var payNow = document.getElementById("payOutstandingButton");
        var reason = document.getElementById("paymentUnavailableReason");
        var mpesa = (latest && latest.mpesa) || {};
        var options = latest ? payableBalances(latest) : [];
        var blocked = [];

        if (!mpesa.ready) {
            blocked.push(mpesa.reason || "M-Pesa payments are not available yet.");
        }

        if (options.length === 0) {
            blocked.push("You have no outstanding fees that can be paid right now.");
        }

        if (submit) {
            submit.disabled = blocked.length > 0;
        }

        /* The entry buttons stay clickable: a disabled control tells the
           student nothing, while a click can explain what is blocking them. */
        if (payNow) {
            payNow.disabled = false;
        }

        showNotice("paymentUnavailable", blocked.length > 0);

        if (reason) {
            reason.textContent = blocked.join(" ");
        }
    }

    function apply(data) {
        latest = data;
        renderTotals(data);
        renderBalances(data);
        renderPayments(data);
        renderPaybills(data);
        populateFeeSelect(data);
        updateFormAvailability();
        renderEnvironment();
    }

    function renderEnvironment() {
        var badge = document.getElementById("environmentBadge");
        var mpesa = (latest && latest.mpesa) || {};

        if (!badge) {
            return;
        }

        if (mpesa.environment === "production") {
            badge.textContent = "Live M-Pesa";
            badge.className = "status-cleared";
            return;
        }

        badge.textContent = "M-Pesa sandbox";
        badge.className = "status-review";
    }

    function loadFees() {
        var identifier = currentIdentifier();
        var loading = document.getElementById("balanceLoading");

        if (loading) {
            loading.hidden = false;
        }

        return request("api/fees.php?identifier=" + encodeURIComponent(identifier))
            .then(function (data) {
                apply(data);
                setMessage("", "");
                setFeesMessage("");

                return data;
            })
            .catch(function (error) {
                setMessage("error", error.message || "Your fee statement could not be loaded.");
                setFeesMessage(error.message || "Your fee statement could not be loaded.");
                showNotice("balanceEmpty", true);

                return null;
            })
            .then(function (data) {
                if (loading) {
                    loading.hidden = true;
                }

                return data;
            });
    }

    function findPayment(data, checkoutRequestId) {
        return (data.payments || []).filter(function (payment) {
            return payment.checkout_request_id === checkoutRequestId;
        })[0] || null;
    }

    function stopPolling() {
        if (pollTimer) {
            window.clearTimeout(pollTimer);
            pollTimer = null;
        }
    }

    function startPolling(checkoutRequestId) {
        var attemptsLeft = POLL_ATTEMPTS;

        stopPolling();

        function poll() {
            attemptsLeft -= 1;

            request("api/fees.php?identifier=" + encodeURIComponent(currentIdentifier()))
                .then(function (data) {
                    apply(data);

                    var payment = findPayment(data, checkoutRequestId);

                    if (payment && payment.status !== "pending") {
                        stopPolling();
                        showNotice("pendingPrompt", false);

                        if (payment.status === "completed") {
                            setMessage("", "Payment confirmed. Receipt " + (payment.mpesa_receipt || "pending") + ".");
                        } else {
                            setMessage("error", payment.result_desc || "That payment was not completed.");
                        }

                        return;
                    }

                    if (attemptsLeft <= 0) {
                        stopPolling();
                        setMessage("", "Still waiting for M-Pesa. This page will not update on its own; refresh to check again.");
                    }
                })
                .catch(function () {
                    if (attemptsLeft <= 0) {
                        stopPolling();
                    }
                });

            if (attemptsLeft > 0) {
                pollTimer = window.setTimeout(poll, POLL_INTERVAL_MS);
            }
        }

        pollTimer = window.setTimeout(poll, POLL_INTERVAL_MS);
    }

    function normalizePhoneInput(value) {
        return String(value || "").replace(/[\s()-]/g, "");
    }

    function isValidMpesaPhone(value) {
        return /^(\+?254|0)?7\d{8}$/.test(normalizePhoneInput(value));
    }

    function onSubmit(event) {
        event.preventDefault();

        var form = event.currentTarget;
        var balance = selectedBalance();
        var phoneField = document.getElementById("phone");
        var amountField = document.getElementById("amount");
        var submit = document.getElementById("submitPayment");

        if (window.formValidation && typeof window.formValidation.validateForm === "function") {
            window.formValidation.validateForm(form);
        }

        if (!balance) {
            setMessage("error", "Choose a fee to pay.");
            return;
        }

        if (!isValidMpesaPhone(phoneField ? phoneField.value : "")) {
            setMessage("error", "Enter a valid M-Pesa phone number in the format 07XXXXXXXX.");
            return;
        }

        var amount = Number(amountField ? amountField.value : 0);

        if (!(amount >= 1)) {
            setMessage("error", "Enter a payment amount of at least 1.");
            return;
        }

        if (amount - Number(balance.outstanding) > 0.009) {
            setMessage("error", "The amount is more than the outstanding balance of " + formatMoney(balance.outstanding) + ".");
            return;
        }

        if (submit) {
            submit.disabled = true;
        }

        setMessage("", "Starting the M-Pesa request...");

        request("api/mpesa/stkpush.php", {
            identifier: currentIdentifier(),
            category: balance.category,
            balanceId: String(balance.id),
            admissionNumber: currentIdentifier(),
            phone: normalizePhoneInput(phoneField ? phoneField.value : ""),
            amount: amount.toFixed(2)
        }).then(function (data) {
            var reference = document.getElementById("checkoutReference");

            if (reference) {
                reference.textContent = data.checkout_request_id || "";
            }

            var referenceWrap = document.getElementById("checkoutReferenceWrap");

            if (referenceWrap) {
                referenceWrap.hidden = !data.checkout_request_id;
            }

            showNotice("pendingPrompt", true);
            setMessage("", data.message || "Check your phone for the M-Pesa prompt.");
            loadFees().then(function () {
                startPolling(data.checkout_request_id);
            });
        }).catch(function (error) {
            setMessage("error", error.message || "M-Pesa could not start the payment.");
            updateFormAvailability();
        });
    }

    function prefillPhone() {
        var phoneField = document.getElementById("phone");

        if (!phoneField || phoneField.value) {
            return;
        }

        if (!window.KWUST || typeof window.KWUST.getCurrentUser !== "function") {
            return;
        }

        var user = window.KWUST.getCurrentUser();
        var profile = user && user.profile ? user.profile : null;
        var candidate = profile && profile.phone ? profile.phone : "";

        if (isValidMpesaPhone(candidate)) {
            phoneField.value = normalizePhoneInput(candidate);
        }
    }

    function init() {
        var form = document.getElementById("paymentForm");
        var select = document.getElementById("feeSelect");
        var refresh = document.getElementById("refreshFees");
        var payNow = document.getElementById("payOutstandingButton");
        var balanceBody = document.getElementById("balanceBody");
        var modal = paymentModal();
        var identifierElement = document.getElementById("feeIdentifier");

        var identifier = currentIdentifier();

        if (identifierElement) {
            identifierElement.textContent = identifier || "Not signed in";
        }

        if (form) {
            form.addEventListener("submit", onSubmit);
        }

        if (select) {
            select.addEventListener("change", syncFeeSelection);
        }

        if (refresh) {
            refresh.addEventListener("click", function () {
                loadFees();
            });
        }

        if (balanceBody) {
            balanceBody.addEventListener("click", function (event) {
                var trigger = event.target.closest("[data-pay-fee]");

                if (trigger && !openPaymentModal(trigger.getAttribute("data-pay-fee"))) {
                    setFeesMessage("That fee is no longer payable. Press Refresh to check your statement again.");
                }
            });
        }

        if (payNow) {
            payNow.addEventListener("click", function () {
                if (!openPaymentModal(null)) {
                    setFeesMessage(nothingToPayMessage());
                }
            });
        }

        Array.prototype.forEach.call(document.querySelectorAll("[data-close-payment]"), function (button) {
            button.addEventListener("click", closePaymentModal);
        });

        if (modal) {
            modal.addEventListener("click", function (event) {
                if (event.target === modal) {
                    closePaymentModal();
                }
            });
        }

        document.addEventListener("keydown", function (event) {
            if (!modal || !modal.classList.contains("show")) {
                return;
            }

            if (event.key === "Escape") {
                closePaymentModal();
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

        window.addEventListener("beforeunload", stopPolling);

        prefillPhone();
        loadFees().then(function (data) {
            /* The home page sends visitors here to pay, so the form waits for
               them rather than making them hunt for it. */
            if (data && String(window.location.hash || "").toLowerCase() === "#pay" && !openPaymentModal(null)) {
                setFeesMessage(nothingToPayMessage());
            }
        });
    }

    document.addEventListener("DOMContentLoaded", init);

    window.KWUSTPayments = {
        refresh: loadFees,
        formatMoney: formatMoney,
        openModal: openPaymentModal,
        closeModal: closePaymentModal
    };
}(window));
