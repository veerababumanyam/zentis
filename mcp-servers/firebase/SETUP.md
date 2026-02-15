# Firebase MCP Quick Setup Guide

## ✅ Installation Complete

Your Firebase MCP server has been successfully installed and built!

### Location
```
/Users/v13478/Downloads/Zentis/mcp-servers/firebase/
```

## 🔑 Configuration Steps

### Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click **⚙ Project Settings** (top left)
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the JSON file securely

### Step 2: Configure Environment Variables

Create `.env.local` in the Firebase MCP directory:

```bash
cd /Users/v13478/Downloads/Zentis/mcp-servers/firebase
cp .env.example .env.local
```

Edit `.env.local`:

```env
FIREBASE_KEY_PATH=./firebase-service-account-key.json
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

**Place your service account JSON file in the firebase directory:**

```bash
cp ~/Downloads/your-project-firebase-adminsdk-xxxxx.json ./firebase-service-account-key.json
```

### Step 3: Integrate with Claude Desktop

#### macOS

1. Edit MCP Configuration:
```bash
nano ~/.config/claude/claude_desktop_config.json
```

2. Add Firebase MCP server:
```json
{
  "mcpServers": {
    "firebase": {
      "command": "node",
      "args": ["/Users/v13478/Downloads/Zentis/mcp-servers/firebase/dist/index.js"],
      "env": {
        "FIREBASE_KEY_PATH": "/Users/v13478/Downloads/Zentis/mcp-servers/firebase/firebase-service-account-key.json"
      }
    }
  }
}
```

3. Restart Claude Desktop for changes to take effect

#### Windows

1. Edit `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the Firebase server config (update paths for Windows):
```json
{
  "mcpServers": {
    "firebase": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp-servers\\firebase\\dist\\index.js"],
      "env": {
        "FIREBASE_KEY_PATH": "C:\\path\\to\\firebase-service-account-key.json"
      }
    }
  }
}
```

### Step 4: Test the Server

You can test the MCP server using the MCP Inspector:

```bash
cd /Users/v13478/Downloads/Zentis/mcp-servers/firebase

# Install MCP Inspector globally if not already installed
npm install -g @modelcontextprotocol/inspector

# Run the inspector
@modelcontextprotocol/inspector node dist/index.js
```

This opens a web interface where you can test all Firebase tools.

## 🛠 Available Tools

### Firestore
- **firestore_get_document** - Retrieve a single document
- **firestore_query_collection** - Query with filters, ordering, pagination
- **firestore_create_document** - Create new documents
- **firestore_update_document** - Update existing documents
- **firestore_delete_document** - Delete documents

### Authentication
- **auth_create_user** - Create user account
- **auth_get_user** - Get user info by email
- **auth_update_user** - Update user details
- **auth_delete_user** - Delete user account

### Cloud Storage
- **storage_list_files** - List files in bucket
- **storage_get_file_url** - Get public URLs

## 🚀 Usage Examples

```
Ask Claude:
"Get the user document with ID 'user123' from the 'users' collection"

"Query the 'patients' collection for documents where status == 'active', ordered by created_at"

"Create a new patient record in the 'patients' collection with name 'John Doe' and email 'john@example.com'"

"Delete the user with UID 'abc123'"
```

## 🔒 Security Notes

1. **Never commit** `firebase-service-account-key.json`
2. **Use environment variables** for sensitive data
3. **Restrict Firebase Rules** in Console
4. **Use appropriate IAM roles** for service accounts
5. **Rotate keys periodically**

## 📝 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `FIREBASE_KEY_PATH` | Path to service account JSON | `./firebase-service-account-key.json` |
| `FIREBASE_KEY_JSON` | Service account JSON as string | `{"type":"service_account",...}` |
| `FIREBASE_DATABASE_URL` | Realtime DB URL (optional) | `https://myapp.firebaseio.com` |

## 🐛 Troubleshooting

### Server fails to start
- ✅ Verify Firebase credentials are set
- ✅ Check file paths are correct
- ✅ Ensure Node.js 18+ is installed

### "Permission denied" errors
- ✅ Check Firebase Security Rules in Console
- ✅ Verify service account has Firestore/Storage permissions
- ✅ Ensure collection names are correct

### MCP Inspector not working
```bash
npm install -g @modelcontextprotocol/inspector
@modelcontextprotocol/inspector node dist/index.js
```

## 📚 Resources

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [MCP Documentation](https://modelcontextprotocol.io)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security)

## ✨ Next Steps

1. ✅ Add service account key
2. ✅ Configure `.env.local`
3. ✅ Update Claude Desktop config
4. ✅ Test with MCP Inspector
5. ✅ Start using in Claude Desktop!

Your Firebase MCP server is ready to use! 🎉
