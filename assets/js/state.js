/* Shared demo data and browser state */
(function (window) {
    "use strict";

    var STORAGE_KEY = "kwust-clear-path-state-v1";
    var SESSION_KEY = "kwust-clear-path-session-v1";
    var SESSION_TIMEOUT = 15 * 60 * 1000;
    var FILE_DATABASE_NAME = "kwust-clear-path-files-v1";
    var FILE_STORE_NAME = "request-files";
    var degreeOptions = ["Computer Science", "Mechanical Engineering", "Economics", "Civil Engineering", "Biochemistry"];
    var idCounter = 0;

    var departmentDefinitions = [
        {
            id: "library",
            name: "University Library",
            shortName: "Library",
            description: "Returned books, borrowed materials, and library charges."
        },
        {
            id: "finance",
            name: "Finance Office",
            shortName: "Finance",
            description: "Outstanding fees, payments, and financial holds."
        },
        {
            id: "departmentHead",
            name: "Department Head",
            shortName: "Department Head",
            description: "Academic results, project completion, and department records."
        },
        {
            id: "hostels",
            name: "Hostels Office",
            shortName: "Hostels",
            description: "Room charges, hostel records, and accommodation returns."
        }
    ];

    function makeChecklist(library, finance, departmentHead, hostels, libraryFeedback) {
        return {
            library: makeDepartmentStatus(library, libraryFeedback),
            finance: makeDepartmentStatus(finance),
            departmentHead: makeDepartmentStatus(departmentHead),
            hostels: makeDepartmentStatus(hostels)
        };
    }

    function makeDepartmentStatus(status, feedback) {
        return {
            status: status,
            feedback: feedback || "",
            updatedAt: status === "pending" ? "" : "18 Sep 2026, 10:15 AM",
            updatedBy: status === "cleared" ? "Records Office" : ""
        };
    }

    function makeStudent(id, name, email, phone, degree, graduationYear, checklist, profileComplete, status) {
        return {
            id: id,
            name: name,
            email: email,
            phone: phone,
            degree: degree,
            graduationYear: graduationYear,
            profileComplete: profileComplete,
            status: status || "active",
            archivedAt: status === "alumni" ? "18 Sep 2026" : "",
            checklist: checklist
        };
    }

    function createDefaultState() {
        return {
            version: 1,
            departments: departmentDefinitions,
            students: [
                makeStudent(
                    "KUM-24-0187",
                    "Akosua Mensah",
                    "",
                    "",
                    "Computer Science",
                    2026,
                    makeChecklist("cleared", "pending", "pending", "cleared"),
                    false,
                    "active"
                ),
                makeStudent(
                    "KUM-24-0214",
                    "Kwame Boateng",
                    "kwame.boateng@example.edu",
                    "+233 20 555 0102",
                    "Mechanical Engineering",
                    2026,
                    makeChecklist("cleared", "cleared", "cleared", "cleared"),
                    true,
                    "alumni"
                ),
                makeStudent(
                    "KUM-24-0098",
                    "Efua Sarpong",
                    "efua.sarpong@example.edu",
                    "+233 20 555 0118",
                    "Economics",
                    2026,
                    makeChecklist("flagged", "pending", "pending", "cleared", "Unreturned library book"),
                    true,
                    "active"
                ),
                makeStudent(
                    "KUM-24-0331",
                    "Yaw Asante",
                    "yaw.asante@example.edu",
                    "+233 20 555 0144",
                    "Computer Science",
                    2027,
                    makeChecklist("pending", "cleared", "cleared", "pending"),
                    true,
                    "active"
                ),
                makeStudent(
                    "KUM-24-0402",
                    "Ama Owusu",
                    "ama.owusu@example.edu",
                    "+233 20 555 0161",
                    "Civil Engineering",
                    2027,
                    makeChecklist("pending", "pending", "pending", "pending"),
                    true,
                    "active"
                ),
                makeStudent(
                    "KUM-24-0520",
                    "Kofi Owusu",
                    "kofi.owusu@example.edu",
                    "+233 20 555 0183",
                    "Biochemistry",
                    2028,
                    makeChecklist("cleared", "cleared", "cleared", "cleared"),
                    true,
                    "alumni"
                )
            ],
            alumni: [
                {
                    id: "KUM-24-0214",
                    name: "Kwame Boateng",
                    degree: "Mechanical Engineering",
                    graduationYear: 2026,
                    phone: "+233 20 555 0102",
                    employmentStatus: "Graduate Engineer",
                    professionalLinks: "https://www.linkedin.com/",
                    updatedAt: "18 Sep 2026"
                },
                {
                    id: "KUM-24-0520",
                    name: "Kofi Owusu",
                    degree: "Biochemistry",
                    graduationYear: 2028,
                    phone: "+233 20 555 0183",
                    employmentStatus: "Research Assistant",
                    professionalLinks: "https://www.linkedin.com/",
                    updatedAt: "20 Sep 2026"
                },
                {
                    id: "KUM-19-0064",
                    name: "Naa Adjeley Lartey",
                    degree: "Computer Science",
                    graduationYear: 2019,
                    phone: "+233 20 555 0197",
                    employmentStatus: "Software Engineer",
                    professionalLinks: "https://www.linkedin.com/",
                    updatedAt: "12 Aug 2026"
                }
            ],
            notifications: [
                {
                    id: "welcome-notification",
                    recipientId: "KUM-24-0187",
                    type: "info",
                    title: "Welcome to Clear Path",
                    message: "Your four-department clearance checklist is ready.",
                    createdAt: "20 Sep 2026, 9:00 AM",
                    read: false
                }
            ],
            requests: [],
            audit: [
                {
                    id: "audit-1",
                    action: "CHECKLIST_GENERATED",
                    studentId: "KUM-24-0187",
                    actor: "System",
                    details: "Generated Library, Finance, Department Head, and Hostels checklist.",
                    createdAt: "20 Sep 2026, 9:00 AM"
                },
                {
                    id: "audit-2",
                    action: "PROFILE_UPDATED",
                    studentId: "KUM-24-0187",
                    actor: "Akosua Mensah",
                    details: "Student profile created.",
                    createdAt: "20 Sep 2026, 9:03 AM"
                }
            ]
        };
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

    function isValidHttpsUrl(value) {
        try {
            return new URL(value).protocol === "https:";
        } catch (error) {
            return false;
        }
    }

    function makeId(prefix) {
        idCounter += 1;
        return prefix + Date.now() + "-" + idCounter;
    }

    function readStorage(storage, key) {
        try {
            return storage.getItem(key);
        } catch (error) {
            return null;
        }
    }

    function writeStorage(storage, key, value) {
        try {
            storage.setItem(key, value);
        } catch (error) {
            return false;
        }

        return true;
    }

    function removeStorage(storage, key) {
        try {
            storage.removeItem(key);
        } catch (error) {
            return false;
        }

        return true;
    }

    function openFileDatabase() {
        return new Promise(function (resolve, reject) {
            if (!window.indexedDB) {
                reject(new Error("File storage is unavailable."));
                return;
            }

            var request = window.indexedDB.open(FILE_DATABASE_NAME, 1);

            request.onupgradeneeded = function () {
                var database = request.result;

                if (!database.objectStoreNames.contains(FILE_STORE_NAME)) {
                    database.createObjectStore(FILE_STORE_NAME, { keyPath: "requestId" });
                }
            };
            request.onsuccess = function () {
                resolve(request.result);
            };
            request.onerror = function () {
                reject(request.error || new Error("File storage could not be opened."));
            };
        });
    }

    function saveRequestFile(user, requestId, file) {
        var visibleRequest = getRequestsForUser(user).filter(function (request) {
            return request.id === requestId;
        })[0];

        if (!visibleRequest || !isAllowedRequestFile(file)) {
            return Promise.reject(new Error("The request file could not be validated."));
        }

        return openFileDatabase().then(function (database) {
            return new Promise(function (resolve, reject) {
                var transaction = database.transaction(FILE_STORE_NAME, "readwrite");

                try {
                    transaction.objectStore(FILE_STORE_NAME).put({
                        requestId: requestId,
                        blob: file,
                        name: file.name,
                        type: file.type,
                        size: file.size
                    });
                } catch (error) {
                    database.close();
                    reject(error);
                    return;
                }

                transaction.oncomplete = function () {
                    database.close();
                    resolve(true);
                };
                transaction.onerror = function () {
                    database.close();
                    reject(transaction.error || new Error("The request file could not be saved."));
                };
                transaction.onabort = function () {
                    database.close();
                    reject(transaction.error || new Error("The request file save was cancelled."));
                };
            });
        });
    }

    function getRequestFile(user, requestId) {
        var visibleRequest = getRequestsForUser(user).filter(function (request) {
            return request.id === requestId;
        })[0];

        if (!visibleRequest) {
            return Promise.reject(new Error("The request file is not available for this account."));
        }

        return openFileDatabase().then(function (database) {
            return new Promise(function (resolve, reject) {
                var transaction = database.transaction(FILE_STORE_NAME, "readonly");
                var objectRequest = transaction.objectStore(FILE_STORE_NAME).get(requestId);
                var storedBlob = null;

                objectRequest.onsuccess = function () {
                    storedBlob = objectRequest.result ? objectRequest.result.blob : null;
                };
                transaction.oncomplete = function () {
                    database.close();
                    resolve(storedBlob);
                };
                transaction.onerror = function () {
                    database.close();
                    reject(transaction.error || new Error("The request file could not be read."));
                };
                transaction.onabort = function () {
                    database.close();
                    reject(transaction.error || new Error("The request file read was cancelled."));
                };
            });
        });
    }

    function clearRequestFiles() {
        if (!window.indexedDB) {
            return Promise.resolve(false);
        }

        return new Promise(function (resolve) {
            var request = window.indexedDB.deleteDatabase(FILE_DATABASE_NAME);
            request.onsuccess = function () {
                resolve(true);
            };
            request.onerror = function () {
                resolve(false);
            };
            request.onblocked = function () {
                resolve(false);
            };
        });
    }

    function normalizeState(state) {
        if (!state || !Array.isArray(state.students)) {
            return createDefaultState();
        }

        state.departments = departmentDefinitions;
        state.alumni = (Array.isArray(state.alumni) ? state.alumni : []).filter(function (alumnus) {
            return alumnus && alumnus.id;
        }).map(function (alumnus) {
            return {
                id: String(alumnus.id),
                name: String(alumnus.name || "Unknown graduate"),
                degree: String(alumnus.degree || "Undeclared programme"),
                graduationYear: alumnus.graduationYear || new Date().getFullYear(),
                phone: String(alumnus.phone || "Not provided"),
                employmentStatus: String(alumnus.employmentStatus || "Not provided"),
                professionalLinks: String(alumnus.professionalLinks || "Not provided"),
                updatedAt: String(alumnus.updatedAt || "")
            };
        });
        state.notifications = (Array.isArray(state.notifications) ? state.notifications : []).filter(function (notification) {
            return notification && notification.id;
        }).map(function (notification) {
            return {
                id: String(notification.id),
                recipientId: String(notification.recipientId || ""),
                recipientRole: String(notification.recipientRole || ""),
                recipientDepartment: String(notification.recipientDepartment || ""),
                type: notification.type || "info",
                title: String(notification.title || "Clearance update"),
                message: String(notification.message || ""),
                createdAt: String(notification.createdAt || ""),
                read: Boolean(notification.read),
                readBy: Array.isArray(notification.readBy) ? notification.readBy.map(String) : []
            };
        });
        state.requests = (Array.isArray(state.requests) ? state.requests : []).filter(function (request) {
            return request && request.studentId;
        }).map(function (request, index) {
            var type = ["financial", "identity", "academic", "other"].indexOf(request.type) === -1 ? "other" : request.type;
            var status = ["pending", "resolved", "rejected"].indexOf(request.status) === -1 ? "pending" : request.status;
            var fileSize = Number(request.fileSize);

            return {
                id: String(request.id || "request-imported-" + index),
                studentId: String(request.studentId),
                type: type,
                departmentId: request.departmentId || requestDepartmentForType(type),
                details: String(request.details || "").slice(0, 1000),
                fileName: String(request.fileName || ""),
                fileType: String(request.fileType || "").toLowerCase(),
                fileSize: isFinite(fileSize) && fileSize >= 0 ? fileSize : 0,
                fileStored: Boolean(request.fileStored),
                status: status,
                feedback: String(request.feedback || "").slice(0, 1000),
                submittedAt: request.submittedAt || "",
                updatedAt: request.updatedAt || ""
            };
        });
        state.audit = (Array.isArray(state.audit) ? state.audit : []).filter(function (entry) {
            return entry && entry.id;
        }).map(function (entry) {
            return {
                id: String(entry.id),
                action: entry.action || "SYSTEM_EVENT",
                studentId: entry.studentId || "",
                departmentId: entry.departmentId || "",
                actor: entry.actor || "System",
                details: String(entry.details || ""),
                createdAt: String(entry.createdAt || "")
            };
        });

        state.students = state.students.filter(function (student) {
            return student && student.id;
        });

        state.students.forEach(function (student) {
            student.id = String(student.id);
            student.name = student.name || "Unknown student";
            student.email = student.email || "";
            student.phone = student.phone || "";
            student.degree = student.degree || "Undeclared programme";
            student.graduationYear = student.graduationYear || new Date().getFullYear();
            student.profileComplete = Boolean(student.profileComplete);
            student.status = student.status === "alumni" ? "alumni" : "active";
            student.archivedAt = student.archivedAt || "";
            student.checklist = student.checklist && typeof student.checklist === "object" ? student.checklist : makeChecklist("pending", "pending", "pending", "pending");

            departmentDefinitions.forEach(function (department) {
                var item = student.checklist[department.id] || makeDepartmentStatus("pending");

                if (["cleared", "pending", "flagged"].indexOf(item.status) === -1) {
                    item.status = "pending";
                }

                item.feedback = item.feedback || "";
                item.updatedAt = item.updatedAt || "";
                item.updatedBy = item.updatedBy || "";
                student.checklist[department.id] = item;
            });
        });

        return state;
    }

    function loadState() {
        var storedState = readStorage(window.localStorage, STORAGE_KEY);

        if (!storedState) {
            var initialState = createDefaultState();
            saveState(initialState);
            return initialState;
        }

        try {
            return normalizeState(JSON.parse(storedState));
        } catch (error) {
            var fallbackState = createDefaultState();
            saveState(fallbackState);
            return fallbackState;
        }
    }

    function saveState(state) {
        return writeStorage(window.localStorage, STORAGE_KEY, JSON.stringify(normalizeState(state)));
    }

    function getState() {
        return loadState();
    }

    function getDepartments() {
        return getState().departments;
    }

    function getDepartment(departmentId) {
        var departments = getDepartments();

        for (var index = 0; index < departments.length; index += 1) {
            if (departments[index].id === departmentId) {
                return departments[index];
            }
        }

        return null;
    }

    function findStudent(state, studentId) {
        var students = state.students;

        for (var index = 0; index < students.length; index += 1) {
            if (students[index].id === studentId) {
                return students[index];
            }
        }

        return null;
    }

    function getStudent(studentId) {
        return findStudent(getState(), studentId);
    }

    function getStoredSession() {
        var candidates = [
            { storage: window.sessionStorage, value: readStorage(window.sessionStorage, SESSION_KEY) },
            { storage: window.localStorage, value: readStorage(window.localStorage, SESSION_KEY) }
        ];

        for (var index = 0; index < candidates.length; index += 1) {
            var candidate = candidates[index];

            if (!candidate.value) {
                continue;
            }

            try {
                var session = JSON.parse(candidate.value);

                if (typeof session.identifier !== "string" || !session.identifier || session.identifier.length > 80 ||
                    ["student", "department", "super", "alumni"].indexOf(session.role) === -1 ||
                    session.role === "department" && !departmentDefinitions.some(function (department) {
                        return department.id === session.department;
                    }) ||
                    typeof session.name !== "string" || !session.name || session.name.length > 200 ||
                    typeof session.lastActivity !== "number" || !isFinite(session.lastActivity) || session.lastActivity <= 0 ||
                    session.lastActivity > Date.now() + 1000 || Date.now() - session.lastActivity > SESSION_TIMEOUT) {
                    removeStorage(candidate.storage, SESSION_KEY);
                    continue;
                }

                return { session: session, storage: candidate.storage };
            } catch (error) {
                removeStorage(candidate.storage, SESSION_KEY);
            }
        }

        return null;
    }

    function getCurrentUser() {
        var stored = getStoredSession();

        if (!stored) {
            return null;
        }

        return stored.session;
    }

    function setSession(user, remember) {
        var session = {
            identifier: user.identifier,
            role: user.role,
            name: user.name,
            department: user.department || "",
            remember: Boolean(remember),
            lastActivity: Date.now()
        };

        var stored;

        if (remember) {
            stored = writeStorage(window.localStorage, SESSION_KEY, JSON.stringify(session));

            if (!stored) {
                return null;
            }

            if (!removeStorage(window.sessionStorage, SESSION_KEY)) {
                removeStorage(window.localStorage, SESSION_KEY);
                return null;
            }
        } else {
            stored = writeStorage(window.sessionStorage, SESSION_KEY, JSON.stringify(session));

            if (!stored) {
                return null;
            }

            if (!removeStorage(window.localStorage, SESSION_KEY)) {
                removeStorage(window.sessionStorage, SESSION_KEY);
                return null;
            }
        }

        return stored ? session : null;
    }

    function touchSession() {
        var stored = getStoredSession();

        if (!stored) {
            return null;
        }

        stored.session.lastActivity = Date.now();

        if (!writeStorage(stored.storage, SESSION_KEY, JSON.stringify(stored.session))) {
            return null;
        }

        return stored.session;
    }

    function updateSessionName(name) {
        var stored = getStoredSession();

        if (!stored) {
            return false;
        }

        stored.session.name = name;
        return writeStorage(stored.storage, SESSION_KEY, JSON.stringify(stored.session));
    }

    function clearSession() {
        removeStorage(window.sessionStorage, SESSION_KEY);
        removeStorage(window.localStorage, SESSION_KEY);
    }

    function getProgress(student) {
        if (!student || !student.checklist) {
            return 0;
        }

        var clearedCount = 0;

        departmentDefinitions.forEach(function (department) {
            if (student.checklist[department.id] && student.checklist[department.id].status === "cleared") {
                clearedCount += 1;
            }
        });

        return Math.round((clearedCount / departmentDefinitions.length) * 100);
    }

    function getClearedCount(student) {
        return Math.round((getProgress(student) / 100) * departmentDefinitions.length);
    }

    function getPendingCount(student) {
        if (!student || !student.checklist) {
            return 0;
        }

        return departmentDefinitions.filter(function (department) {
            return student.checklist[department.id] && student.checklist[department.id].status === "pending";
        }).length;
    }

    function getFlaggedCount(student) {
        if (!student || !student.checklist) {
            return 0;
        }

        return departmentDefinitions.filter(function (department) {
            return student.checklist[department.id] && student.checklist[department.id].status === "flagged";
        }).length;
    }

    function getCurrentStudent() {
        var user = getCurrentUser();

        if (!user || user.role !== "student") {
            return null;
        }

        return getStudent(user.identifier);
    }

    function addAudit(state, action, studentId, details, actor, departmentId) {
        state.audit.unshift({
            id: makeId("audit-"),
            action: action,
            studentId: studentId,
            departmentId: departmentId || "",
            actor: actor || "System",
            details: details,
            createdAt: new Date().toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            })
        });
    }

    function addNotification(state, notification) {
        state.notifications.unshift({
            id: makeId("notification-"),
            recipientId: notification.recipientId || "",
            recipientRole: notification.recipientRole || "",
            recipientDepartment: notification.recipientDepartment || "",
            type: notification.type || "info",
            title: notification.title,
            message: notification.message,
            createdAt: new Date().toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }),
            read: false,
            readBy: []
        });
    }

    function isAllowedRequestFile(file) {
        var allowedFileTypes = ["application/pdf", "image/jpeg", "image/png"];

        return Boolean(file && file.name && /\.(pdf|jpe?g|png)$/i.test(file.name) && file.size <= 5 * 1024 * 1024 && allowedFileTypes.indexOf(String(file.type || "").toLowerCase()) !== -1);
    }

    function requestDepartmentForType(type) {
        var departments = {
            financial: "finance",
            identity: "library",
            academic: "departmentHead"
        };

        return departments[type] || "";
    }

    function addRequest(user, details) {
        var state = getState();
        var student = user ? findStudent(state, user.identifier) : null;
        var type = details ? String(details.type || "").trim() : "";
        var requestDetails = details ? String(details.details || "").trim() : "";
        var file = details ? details.file : null;
        var fileName = details ? String(details.fileName || file && file.name || "").trim() : "";
        var fileType = details ? String(details.fileType || file && file.type || "").trim().toLowerCase() : "";
        var fileSize = details && Number(details.fileSize) >= 0 ? Number(details.fileSize) : file ? Number(file.size) : 0;
        var allowedTypes = ["financial", "identity", "academic", "other"];
        var allowedFileTypes = ["application/pdf", "image/jpeg", "image/png"];

        if (!user || user.role !== "student" || !student || student.status !== "active" || allowedTypes.indexOf(type) === -1 || !requestDetails || requestDetails.length > 1000 || containsUnsafeText(requestDetails)) {
            return null;
        }

        if (fileName && (containsUnsafeText(fileName) || !/\.(pdf|jpe?g|png)$/i.test(fileName) || allowedFileTypes.indexOf(fileType) === -1 || fileSize > 5 * 1024 * 1024 || !isAllowedRequestFile(file))) {
            return null;
        }

        var request = {
            id: makeId("request-"),
            studentId: student.id,
            type: type,
            departmentId: requestDepartmentForType(type),
            details: requestDetails,
            fileName: fileName,
            fileType: fileType,
            fileSize: fileSize,
            fileStored: false,
            status: "pending",
            feedback: "",
            submittedAt: new Date().toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }),
            updatedAt: ""
        };

        state.requests.unshift(request);
        addAudit(state, "REQUEST_SUBMITTED", student.id, "Student submitted a " + type + " request.", student.name, request.departmentId);
        addNotification(state, {
            recipientId: student.id,
            type: "info",
            title: "Request submitted",
            message: "Your " + type + " request is now in the records queue."
        });

        if (request.departmentId) {
            addNotification(state, {
                recipientRole: "department",
                recipientDepartment: request.departmentId,
                type: "info",
                title: "New clearance request",
                message: student.name + " submitted a " + type + " request."
            });
        }

        addNotification(state, {
            recipientRole: "super",
            type: "info",
            title: "New clearance request",
            message: student.name + " submitted a " + type + " request."
        });

        if (!saveState(state)) {
            return null;
        }

        return request;
    }

    function getRequestsForUser(user, filters) {
        var state = getState();
        var requests = state.requests.slice();
        var search = filters && filters.search ? String(filters.search).toLowerCase() : "";
        var status = filters && filters.status ? filters.status : "all";

        if (!user || ["student", "department", "super"].indexOf(user.role) === -1) {
            return [];
        }

        if (user.role === "student") {
            requests = requests.filter(function (request) {
                return request.studentId === user.identifier;
            });
        }

        if (user && user.role === "department") {
            if (!departmentDefinitions.some(function (department) {
                return department.id === user.department;
            })) {
                return [];
            }

            requests = requests.filter(function (request) {
                return request.departmentId === user.department;
            });
        }

        return requests.filter(function (request) {
            var student = findStudent(state, request.studentId);

            if (!student) {
                return false;
            }

            var studentName = student.name.toLowerCase();
            var matchesSearch = search === "" || studentName.indexOf(search) !== -1 || request.id.toLowerCase().indexOf(search) !== -1;
            var matchesStatus = status === "all" || request.status === status;
            return matchesSearch && matchesStatus;
        });
    }

    function markRequestFileStored(user, requestId, stored) {
        var state = getState();
        var request = state.requests.filter(function (item) {
            return item.id === requestId;
        })[0];

        if (!request || !getRequestsForUser(user).some(function (item) {
            return item.id === requestId;
        })) {
            return false;
        }

        request.fileStored = Boolean(stored);
        return saveState(state);
    }

    function updateRequestStatus(user, requestId, status, feedback) {
        var state = getState();
        var request = state.requests.filter(function (item) {
            return item.id === requestId;
        })[0];
        var cleanFeedback = String(feedback || "").trim();

        if (!user || !request || ["pending", "resolved", "rejected"].indexOf(status) === -1) {
            return null;
        }

        if (user.role !== "super" && (user.role !== "department" || request.departmentId !== user.department)) {
            return null;
        }

        if (status === "rejected" && (!cleanFeedback || cleanFeedback.length > 1000 || containsUnsafeText(cleanFeedback))) {
            return null;
        }

        request.status = status;
        request.feedback = status === "rejected" ? cleanFeedback : "";
        request.updatedAt = new Date().toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });

        addAudit(state, status === "resolved" ? "REQUEST_RESOLVED" : status === "rejected" ? "REQUEST_REJECTED" : "REQUEST_REOPENED", request.studentId, status === "rejected" ? "Request rejected: " + cleanFeedback : "Request status changed to " + status + ".", user.name, request.departmentId);
        addNotification(state, {
            recipientId: request.studentId,
            type: status === "resolved" ? "success" : status === "rejected" ? "warning" : "info",
            title: status === "resolved" ? "Request resolved" : status === "rejected" ? "Request needs attention" : "Request reopened",
            message: status === "rejected" ? cleanFeedback : "Your request status is now " + status + "."
        });
        if (!saveState(state)) {
            return null;
        }

        return request;
    }

    function archiveStudent(state, student) {
        student.status = "alumni";
        student.archivedAt = student.archivedAt || new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

        var existingAlumni = state.alumni.filter(function (alumnus) {
            return alumnus.id === student.id;
        })[0];

        if (existingAlumni) {
            existingAlumni.name = student.name;
            existingAlumni.degree = student.degree;
            existingAlumni.graduationYear = student.graduationYear;
            existingAlumni.phone = student.phone;
            existingAlumni.updatedAt = student.archivedAt;
            return;
        }

        state.alumni.unshift({
            id: student.id,
            name: student.name,
            degree: student.degree,
            graduationYear: student.graduationYear,
            phone: student.phone,
            employmentStatus: "Not provided",
            professionalLinks: "Not provided",
            updatedAt: student.archivedAt
        });
    }

    function updateProfile(studentId, details, actingUser) {
        var state = getState();
        var student = findStudent(state, studentId);
        var normalizedDetails = details ? {
            name: String(details.name || "").trim(),
            email: String(details.email || "").trim(),
            phone: String(details.phone || "").trim(),
            degree: String(details.degree || "").trim()
        } : null;

        if (!actingUser || actingUser.role !== "student" || actingUser.identifier !== studentId || !student || !normalizedDetails || !normalizedDetails.name || !normalizedDetails.email || !normalizedDetails.phone || !normalizedDetails.degree ||
            normalizedDetails.name.length > 100 || normalizedDetails.email.length > 120 || normalizedDetails.phone.length > 30 || normalizedDetails.degree.length > 120 || degreeOptions.indexOf(normalizedDetails.degree) === -1 ||
            !isValidEmail(normalizedDetails.email) || !isValidPhone(normalizedDetails.phone) ||
            containsUnsafeText(normalizedDetails.name) || containsUnsafeText(normalizedDetails.email) ||
            containsUnsafeText(normalizedDetails.phone) || containsUnsafeText(normalizedDetails.degree)) {
            return null;
        }

        student.name = normalizedDetails.name;
        student.email = normalizedDetails.email;
        student.phone = normalizedDetails.phone;
        student.degree = normalizedDetails.degree;
        student.profileComplete = true;

        var currentUser = getCurrentUser();

        if (student.status === "alumni") {
            var alumnus = state.alumni.filter(function (item) {
                return item.id === student.id;
            })[0];

            if (alumnus) {
                alumnus.name = student.name;
                alumnus.degree = student.degree;
                alumnus.graduationYear = student.graduationYear;
                alumnus.phone = student.phone;
                alumnus.updatedAt = new Date().toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                });
            }
        }

        addAudit(state, "PROFILE_UPDATED", student.id, "Student profile details updated.", student.name);
        if (!saveState(state)) {
            return null;
        }

        if (currentUser && currentUser.role === "student" && currentUser.identifier === student.id) {
            updateSessionName(student.name);
        }

        return student;
    }

    function updateDepartmentStatus(studentId, departmentId, status, feedback, actor, actingUser) {
        var state = getState();
        var student = findStudent(state, studentId);
        var department = getDepartment(departmentId);
        var cleanFeedback = String(feedback || "").trim();
        var wasArchived = student && student.status === "alumni";

        if (!actingUser || (actingUser.role !== "super" && (actingUser.role !== "department" || actingUser.department !== departmentId))) {
            return null;
        }

        if (!student || !department || !student.checklist[departmentId] || wasArchived) {
            return null;
        }

        if (["cleared", "pending", "flagged"].indexOf(status) === -1) {
            return null;
        }

        if (status === "flagged" && !cleanFeedback) {
            return null;
        }

        if (status === "cleared" && !student.profileComplete) {
            return null;
        }

        var responsibleActor = actor || actingUser.name || "Records Office";
        student.checklist[departmentId].status = status;
        student.checklist[departmentId].feedback = status === "flagged" ? cleanFeedback : "";
        student.checklist[departmentId].updatedAt = new Date().toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
        student.checklist[departmentId].updatedBy = responsibleActor;

        var action = status === "cleared" ? "DEPARTMENT_CLEARED" : status === "flagged" ? "DEPARTMENT_FLAGGED" : "DEPARTMENT_PENDING";
        var details = status === "cleared"
            ? department.name + " marked cleared with no outstanding dues."
            : status === "flagged"
                ? department.name + " flagged: " + cleanFeedback
                : department.name + " returned to pending review.";
        addAudit(state, action, student.id, details, responsibleActor, department.id);
        addNotification(state, {
            recipientId: student.id,
            type: status === "cleared" ? "success" : status === "flagged" ? "warning" : "info",
            title: department.shortName + (status === "cleared" ? " clearance approved" : status === "flagged" ? " clearance rejected" : " is pending review"),
            message: status === "cleared"
                ? "Your " + department.shortName + " clearance is now cleared."
                : status === "flagged" ? cleanFeedback : "Your request is waiting for department review."
        });

        if (getProgress(student) === 100 && !wasArchived) {
            archiveStudent(state, student);
            addAudit(state, "ALUMNI_ARCHIVED", student.id, "Automatically archived after all four departments were cleared.", "System");
            addNotification(state, {
                recipientId: student.id,
                type: "success",
                title: "Congratulations, you are cleared",
                message: "Your profile has been added to the alumni directory."
            });
        }

        if (!saveState(state)) {
            return null;
        }

        return student;
    }

    function getNotificationsForUser(user) {
        var state = getState();

        if (!user) {
            return [];
        }

        return state.notifications.filter(function (notification) {
            return notificationBelongsToUser(notification, user);
        });
    }

    function notificationBelongsToUser(notification, user) {
        if (!notification || !user) {
            return false;
        }

        var recipientMatches = notification.recipientId && notification.recipientId === user.identifier;
        var roleMatches = notification.recipientRole && notification.recipientRole === user.role &&
            (!notification.recipientDepartment || notification.recipientDepartment === user.department);
        return recipientMatches || roleMatches;
    }

    function getUnreadNotificationCount(user) {
        return getNotificationsForUser(user).filter(function (notification) {
            return !isNotificationReadForUser(notification, user);
        }).length;
    }

    function isNotificationReadForUser(notification, user) {
        if (!notification || !user) {
            return false;
        }

        if (notification.recipientId && notification.recipientId === user.identifier) {
            return Boolean(notification.read);
        }

        return Array.isArray(notification.readBy) && notification.readBy.indexOf(user.identifier) !== -1;
    }

    function markNotificationRead(user, notificationId) {
        var state = getState();
        var notification = state.notifications.filter(function (item) {
            return item.id === notificationId && notificationBelongsToUser(item, user);
        })[0];

        if (!notification || isNotificationReadForUser(notification, user)) {
            return false;
        }

        if (notification.recipientId && notification.recipientId === user.identifier) {
            notification.read = true;
        } else {
            notification.readBy = Array.isArray(notification.readBy) ? notification.readBy : [];
            notification.readBy.push(user.identifier);
        }

        if (!saveState(state)) {
            return false;
        }

        return true;
    }

    function markNotificationsRead(user) {
        var state = getState();
        var changed = false;

        state.notifications.forEach(function (notification) {
            if (notificationBelongsToUser(notification, user) && !isNotificationReadForUser(notification, user)) {
                if (notification.recipientId && notification.recipientId === user.identifier) {
                    notification.read = true;
                } else {
                    notification.readBy = Array.isArray(notification.readBy) ? notification.readBy : [];
                    notification.readBy.push(user.identifier);
                }

                changed = true;
            }
        });

        if (changed) {
            return saveState(state);
        }

        return true;
    }

    function getVisibleStudents(user, filters) {
        var state = getState();
        var search = (filters && filters.search ? filters.search : "").toLowerCase();
        var statusFilter = filters && filters.status ? filters.status : "all";
        var students = state.students.slice();

        if (!user || ["department", "super"].indexOf(user.role) === -1) {
            return [];
        }

        if (user.role === "department") {
            if (!departmentDefinitions.some(function (department) {
                return department.id === user.department;
            })) {
                return [];
            }

            students = students.filter(function (student) {
                return student.status !== "alumni" && student.checklist[user.department].status !== "cleared";
            });
        }

        if (user.role === "super") {
            students = students.filter(function (student) {
                return student.status !== "alumni";
            });
        }

        return students.filter(function (student) {
            var matchesSearch = search === "" ||
                student.name.toLowerCase().indexOf(search) !== -1 ||
                student.id.toLowerCase().indexOf(search) !== -1;
            var matchesStatus = statusFilter === "all" || student.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }

    function getAdminStats(user) {
        var students = user && user.role === "department" ? getReportStudents(user) : getVisibleStudents(user, { search: "", status: "all" });
        var stats = {
            total: students.length,
            pending: 0,
            flagged: 0,
            cleared: 0
        };

        students.forEach(function (student) {
            if (user && user.role === "department") {
                var officeStatus = student.checklist[user.department].status;

                if (officeStatus === "cleared") {
                    stats.cleared += 1;
                } else if (officeStatus === "flagged") {
                    stats.flagged += 1;
                } else {
                    stats.pending += 1;
                }
            } else if (getProgress(student) === 100) {
                stats.cleared += 1;
            } else if (getFlaggedCount(student) > 0) {
                stats.flagged += 1;
            } else {
                stats.pending += 1;
            }
        });

        return stats;
    }

    function getReportStudents(user) {
        var state = getState();

        if (!user || ["student", "alumni", "department", "super"].indexOf(user.role) === -1) {
            return [];
        }

        if (user.role === "department") {
            if (!departmentDefinitions.some(function (department) {
                return department.id === user.department;
            })) {
                return [];
            }

            return state.students.filter(function (student) {
                return Boolean(student.checklist[user.department]);
            });
        }

        if (user && (user.role === "student" || user.role === "alumni")) {
            return state.students.filter(function (student) {
                return student.id === user.identifier;
            });
        }

        return state.students;
    }

    function getAuditEntries(limit, user) {
        var state = getState();
        var entries = state.audit.slice();

        if (!user || ["student", "alumni", "department", "super"].indexOf(user.role) === -1) {
            return [];
        }

        if (user.role === "department") {
            if (!departmentDefinitions.some(function (department) {
                return department.id === user.department;
            })) {
                return [];
            }

            entries = entries.filter(function (entry) {
                return entry.departmentId === user.department;
            });
        } else if (user && (user.role === "student" || user.role === "alumni")) {
            entries = entries.filter(function (entry) {
                return entry.studentId === user.identifier;
            });
        }

        return limit ? entries.slice(0, limit) : entries;
    }

    function searchAlumni(filters) {
        var state = getState();
        var search = (filters && filters.name ? filters.name : "").toLowerCase();
        var year = filters && filters.year ? filters.year : "";
        var course = (filters && filters.course ? filters.course : "").toLowerCase();

        return state.alumni.filter(function (alumnus) {
            var matchesName = search === "" || alumnus.name.toLowerCase().indexOf(search) !== -1;
            var matchesYear = year === "" || String(alumnus.graduationYear) === year;
            var matchesCourse = course === "" || alumnus.degree.toLowerCase().indexOf(course) !== -1;
            return matchesName && matchesYear && matchesCourse;
        });
    }

    function updateAlumniProfile(user, details) {
        var state = getState();
        var normalizedDetails = details ? {
            phone: String(details.phone || "").trim(),
            employmentStatus: String(details.employmentStatus || "").trim(),
            professionalLinks: String(details.professionalLinks || "").trim()
        } : null;

        var canUpdateAlumniProfile = user && (user.role === "alumni" || user.role === "student" && getStudent(user.identifier) && getStudent(user.identifier).status === "alumni");

        if (!canUpdateAlumniProfile || !normalizedDetails || !normalizedDetails.phone || !normalizedDetails.employmentStatus ||
            normalizedDetails.phone.length > 30 || normalizedDetails.employmentStatus.length > 100 || normalizedDetails.professionalLinks.length > 300 ||
            !isValidPhone(normalizedDetails.phone) || containsUnsafeText(normalizedDetails.phone) ||
            containsUnsafeText(normalizedDetails.employmentStatus) || containsUnsafeText(normalizedDetails.professionalLinks) ||
            normalizedDetails.professionalLinks && !isValidHttpsUrl(normalizedDetails.professionalLinks)) {
            return null;
        }

        var alumnus = state.alumni.filter(function (item) {
            return item.id === user.identifier;
        })[0];

        if (!alumnus) {
            return null;
        }

        alumnus.phone = normalizedDetails.phone;
        alumnus.employmentStatus = normalizedDetails.employmentStatus;
        alumnus.professionalLinks = normalizedDetails.professionalLinks || "Not provided";
        alumnus.updatedAt = new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
        addAudit(state, "ALUMNI_PROFILE_UPDATED", alumnus.id, "Alumni profile details updated.", user.name);
        if (!saveState(state)) {
            return null;
        }

        return alumnus;
    }

    function registerStudent(details) {
        var state = getState();
        var identifier = String(details && details.identifier || "").trim();
        var name = String(details && details.name || "").trim();
        var email = String(details && details.email || "").trim();
        var phone = String(details && details.phone || "").trim();
        var degree = String(details && details.degree || "").trim();
        var graduationYear = Number(details && details.graduationYear);

        if (!identifier || !name || findStudent(state, identifier) || containsUnsafeText(identifier) || containsUnsafeText(name) || containsUnsafeText(email) || containsUnsafeText(phone) || containsUnsafeText(degree) || !isValidEmail(email) || (phone && !isValidPhone(phone))) {
            return null;
        }

        var student = {
            id: identifier,
            name: name,
            email: email,
            phone: phone,
            degree: degree || "Undeclared programme",
            graduationYear: isFinite(graduationYear) && graduationYear % 1 === 0 && graduationYear > 0 ? graduationYear : new Date().getFullYear(),
            profileComplete: true,
            status: "active",
            archivedAt: "",
            checklist: makeChecklist("pending", "pending", "pending", "pending")
        };

        state.students.unshift(student);
        addAudit(state, "STUDENT_REGISTERED", student.id, "Student account profile created.", student.name);
        addNotification(state, {
            recipientId: student.id,
            type: "info",
            title: "Welcome to Clear Path",
            message: "Your four-department clearance checklist is ready."
        });

        if (!saveState(state)) {
            return null;
        }

        return student;
    }

    function resetDemoData() {
        var freshState = createDefaultState();

        if (!saveState(freshState)) {
            return null;
        }

        clearRequestFiles();
        return freshState;
    }

    window.KWUST = {
        SESSION_TIMEOUT: SESSION_TIMEOUT,
        departmentDefinitions: departmentDefinitions,
        degreeOptions: degreeOptions,
        getState: getState,
        saveState: saveState,
        resetDemoData: resetDemoData,
        getDepartments: getDepartments,
        getDepartment: getDepartment,
        getStudent: getStudent,
        registerStudent: registerStudent,
        getCurrentUser: getCurrentUser,
        getCurrentStudent: getCurrentStudent,
        setSession: setSession,
        touchSession: touchSession,
        clearSession: clearSession,
        getProgress: getProgress,
        getClearedCount: getClearedCount,
        getPendingCount: getPendingCount,
        getFlaggedCount: getFlaggedCount,
        updateProfile: updateProfile,
        updateDepartmentStatus: updateDepartmentStatus,
        addRequest: addRequest,
        getRequestsForUser: getRequestsForUser,
        saveRequestFile: saveRequestFile,
        getRequestFile: getRequestFile,
        markRequestFileStored: markRequestFileStored,
        updateRequestStatus: updateRequestStatus,
        getNotificationsForUser: getNotificationsForUser,
        isNotificationReadForUser: isNotificationReadForUser,
        getUnreadNotificationCount: getUnreadNotificationCount,
        markNotificationRead: markNotificationRead,
        markNotificationsRead: markNotificationsRead,
        getVisibleStudents: getVisibleStudents,
        getAdminStats: getAdminStats,
        getReportStudents: getReportStudents,
        getAuditEntries: getAuditEntries,
        searchAlumni: searchAlumni,
        updateAlumniProfile: updateAlumniProfile
    };
}(window));
