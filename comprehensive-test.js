// Comprehensive security test file
const express = require('express');
const app = express();

// Hardcoded secrets (should be flagged)
const API_KEY = "sk-1234567890abcdef1234567890abcdef";
const JWT_SECRET = "super-secret-jwt-key-12345";
const DB_PASSWORD = "mypassword123";

// Database connection with hardcoded credentials (should be flagged)
const mongoose = require('mongoose');
mongoose.connect('mongodb://admin:password123@localhost:27017/mydb');

// SQL injection vulnerability (should be flagged)
function getUserData(userId) {
    const query = "SELECT * FROM users WHERE id = " + userId;
    return database.query(query);
}

// XSS vulnerability (should be flagged)
function displayUserMessage(message) {
    document.getElementById("output").innerHTML = message;
}

// Insecure random (should be flagged)
function generateToken() {
    return Math.random().toString(36);
}

// Missing authorization - admin route without auth check (should be flagged)
app.delete('/admin/users/:id', function(req, res) {
    // Delete user without checking if requester is admin
    User.findByIdAndDelete(req.params.id);
    res.send('User deleted');
});

// Missing authorization - sensitive data access (should be flagged)
app.get('/users/:id/private-data', function(req, res) {
    // Access private data without auth
    const privateData = getUserPrivateData(req.params.id);
    res.json(privateData);
});

// Missing authorization function (should be flagged)
function deleteUser(userId) {
    // No authorization check before deleting
    return User.findByIdAndDelete(userId);
}

// Proper implementation with authorization (should NOT be flagged)
app.get('/protected-route', authenticateToken, function(req, res) {
    res.json({ message: 'This is protected' });
});

// Proper implementation (should not be flagged)
function secureGetUserData(userId) {
    const query = "SELECT * FROM users WHERE id = ?";
    return database.query(query, [userId]);
}

// Secure random implementation (should not be flagged)
const crypto = require('crypto');
function generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Private key (should be flagged)
const privateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7...";

// AWS credentials (should be flagged)
const awsConfig = {
    aws_access_key_id: "AKIAIOSFODNN7EXAMPLE",
    aws_secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
};