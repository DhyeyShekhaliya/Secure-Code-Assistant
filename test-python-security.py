#!/usr/bin/env python3
# Test file for Python security rules

# Hardcoded secrets
API_KEY = "sk-1234567890abcdef1234567890abcdef"
SECRET_KEY = "super-secret-key-12345"
PASSWORD = "hardcoded-password123"

# SQL injection vulnerabilities
import sqlite3
user_input = "'; DROP TABLE users; --"
cursor = sqlite3.connect(':memory:').cursor()
query = "SELECT * FROM users WHERE id = " + user_input
cursor.execute("SELECT * FROM users WHERE name = " + user_input)
cursor.execute(f"SELECT * FROM users WHERE id = {user_input}")

# Insecure random
import random
token = random.random()
session_id = random.randint(1000, 9999)

# Code injection
user_code = "print('Hello')"
eval(user_code)
exec(user_code)

# Unsafe deserialization
import pickle
data = b'\x80\x03X\x05\x00\x00\x00hellox94.'
pickle.loads(data)

# Command injection
import subprocess
import os
user_command = "ls -la"
subprocess.call(user_command, shell=True)
os.system(user_command)

# Weak hashing
import hashlib
password_hash = hashlib.md5(b"password").hexdigest()
token_hash = hashlib.sha1(b"token").hexdigest()

# Security assert (bad practice)
def check_permission(user):
    assert user.is_admin, "User must be admin"
    return True

# Flask debug mode
from flask import Flask
app = Flask(__name__)
app.run(debug=True)

# Insecure temp file
import tempfile
temp_file = tempfile.mktemp()