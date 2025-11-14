# ========================================
# MongoDB Atlas Configuration Instructions
# ========================================
#
# After setting up MongoDB Atlas, replace the MONGODB_URI below with your connection string
# 
# Your connection string format:
# mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
#
# Example:
# MONGODB_URI=mongodb+srv://margsetu-admin:yourPassword123@margsetu-cluster.abcde.mongodb.net/margsetu?retryWrites=true&w=majority
#
# Instructions:
# 1. Replace <username> with your database username (e.g., margsetu-admin)
# 2. Replace <password> with your database user password
# 3. Replace <cluster> with your actual cluster address
# 4. Replace <database> with 'margsetu' (our database name)
#
# IMPORTANT SECURITY NOTES:
# - Never commit the real .env file to version control
# - Keep your password secure
# - Use environment-specific databases for development/production
#
# ========================================

# Current configuration (UPDATE THIS):
MONGODB_URI=mongodb://localhost:27017/margsetu

# Atlas configuration (REPLACE THE LINE ABOVE):
# MONGODB_URI=mongodb+srv://margsetu-admin:YOUR_PASSWORD@margsetu-cluster.xxxxx.mongodb.net/margsetu?retryWrites=true&w=majority

# Test database (optional - you can use the same cluster with different database name):
# MONGODB_TEST_URI=mongodb+srv://margsetu-admin:YOUR_PASSWORD@margsetu-cluster.xxxxx.mongodb.net/margsetu_test?retryWrites=true&w=majority