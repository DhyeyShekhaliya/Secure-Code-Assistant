// Test file for security vulnerabilities

// Hardcoded secret (should be flagged)
const API_KEY = "sk-1234567890abcdef1234567890abcdef";

// SQL injection vulnerability (should be flagged)
function getUserData(userId) {
    const query = "SELECT * FROM users WHERE id = " + userId;
    return database.query(query);
}

// XSS vulnerability (should be flagged)
function displayUserMessage(message) {
    document.getElementById("output").innerHTML = message;
}

// Insecure random (should be flagged). 
function generateToken() {
    return Math.random().toString(36);
}

// Proper implementation (should not be flagged)
function secureGetUserData(userId) {
    const query = "SELECT * FROM users WHERE id = ?";
    return database.query(query, [userId]);
}

