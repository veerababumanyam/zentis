# Firebase MCP Server

A Model Context Protocol (MCP) server that enables LLMs and AI agents to interact with Firebase services including Firestore, Authentication, and Cloud Storage.

## Features

- **Firestore Database Operations**
  - Get single documents
  - Query collections with filters, ordering, and limits
  - Create, update, and delete documents

- **Firebase Authentication**
  - Create user accounts
  - Get user information
  - Update user details
  - Delete users

- **Cloud Storage**
  - List files in bucket
  - Get public URLs for files

## Prerequisites

1. **Firebase Project**: Create a project at [Firebase Console](https://console.firebase.google.com)

2. **Service Account Key**: 
   - Go to Firebase Console → Project Settings
   - Navigate to "Service Accounts" tab
   - Click "Generate New Private Key"
   - Save the JSON file securely

3. **Node.js**: Version 18+ required

## Installation

### 1. Install Dependencies

```bash
cd mcp-servers/firebase
npm install
```

### 2. Build the Server

```bash
npm run build
```

### 3. Configure Environment Variables

Copy and configure the environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Firebase credentials:

```env
FIREBASE_KEY_PATH=/path/to/firebase-service-account-key.json
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

**Two ways to provide credentials:**

Option A - File path:
```env
FIREBASE_KEY_PATH=./service-account-key.json
```

Option B - JSON string (useful for CI/CD):
```env
FIREBASE_KEY_JSON={"type":"service_account","project_id":"your-project",...}
```

## Running the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

## Integration with Claude Desktop

To use this MCP server with Claude Desktop:

### macOS/Linux

Edit `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "firebase": {
      "command": "node",
      "args": ["/path/to/mcp-servers/firebase/dist/index.js"],
      "env": {
        "FIREBASE_KEY_PATH": "/path/to/firebase-service-account-key.json",
        "FIREBASE_DATABASE_URL": "https://your-project.firebaseio.com"
      }
    }
  }
}
```

### Windows

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

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

## Available Tools

### Firestore Operations

#### `firestore_get_document`
Retrieve a single document from Firestore.

**Parameters:**
- `collection` (string, required): Collection name
- `document_id` (string, required): Document ID

**Example:**
```
Get the document with ID "user123" from the "users" collection
```

#### `firestore_query_collection`
Query documents with filters, ordering, and pagination.

**Parameters:**
- `collection` (string, required): Collection name
- `filters` (array, optional): Filter conditions with operators (==, <, <=, >, >=, !=, in, array-contains)
- `order_by` (object, optional): Order results by field (asc/desc)
- `limit_results` (number, optional): Max results (default: 50, max: 100)

**Example:**
```
Query users collection where age > 18, ordered by created_at descending, limit to 10 results
```

#### `firestore_create_document`
Create a new document in Firestore.

**Parameters:**
- `collection` (string, required): Collection name
- `document_id` (string, optional): Document ID (auto-generated if omitted)
- `data` (object, required): Document data

#### `firestore_update_document`
Update an existing document.

**Parameters:**
- `collection` (string, required): Collection name
- `document_id` (string, required): Document ID
- `data` (object, required): Fields to update

#### `firestore_delete_document`
Delete a document from Firestore.

**Parameters:**
- `collection` (string, required): Collection name
- `document_id` (string, required): Document ID

### Authentication Operations

#### `auth_create_user`
Create a new user account.

**Parameters:**
- `email` (string, required): User email
- `password` (string, required): User password (min 6 characters)
- `display_name` (string, optional): User display name

#### `auth_get_user`
Get user information by email.

**Parameters:**
- `email` (string, required): User email

#### `auth_update_user`
Update user information.

**Parameters:**
- `uid` (string, required): User UID
- `email` (string, optional): New email
- `password` (string, optional): New password
- `display_name` (string, optional): New display name

#### `auth_delete_user`
Delete a user account.

**Parameters:**
- `uid` (string, required): User UID

### Storage Operations

#### `storage_list_files`
List files in the Firebase Storage bucket.

**Parameters:**
- `prefix` (string, optional): Directory prefix to filter files

#### `storage_get_file_url`
Get a public URL for a specific file.

**Parameters:**
- `file_path` (string, required): Path to file in storage

## Testing

You can test the MCP server using the MCP Inspector:

```bash
# Build first
npm run build

# Run inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

This will open a web interface where you can test tools and see responses.

## Security Considerations

1. **Never commit service account keys** to version control
2. **Use environment variables** for sensitive credentials
3. **Restrict Firebase Security Rules** in Firestore and Storage
4. **Enable authentication** in Firebase Console
5. **Use appropriate IAM roles** for service accounts
6. **Rotate service accounts regularly**

## Troubleshooting

### "Firebase credentials not found"
- Ensure `FIREBASE_KEY_PATH` or `FIREBASE_KEY_JSON` is set
- Verify the file path is correct
- Check that the service account JSON is valid

### "Permission denied" errors
- Check Firebase Security Rules in console
- Verify service account has appropriate permissions
- Ensure database/collection names are correct

### "Document not found"
- Verify the collection and document ID exist
- Check for case sensitivity
- Ensure you're querying the correct collection

### Connection issues
- Verify internet connection
- Check Firebase project is accessible
- Ensure service account isn't disabled

## Development

### Project Structure

```
mcp-servers/firebase/
├── src/
│   └── index.ts          # Main server implementation
├── dist/                 # Compiled JavaScript
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── README.md            # This file
```

### Building and Running

```bash
# Compile TypeScript to JavaScript
npm run build

# Watch mode (auto-compile on changes)
npm run watch

# Run in development
npm run dev

# Start compiled server
npm start
```

## Contributing

When adding new tools:

1. Define the tool in the `firebaseTools` array with clear descriptions
2. Add the implementation in the `tools/call` handler
3. Include error handling with actionable messages
4. Test with MCP Inspector
5. Update this README

## License

This MCP server is part of the Zentis project.

## References

- [Model Context Protocol](https://modelcontextprotocol.io)
- [Firebase Admin SDK](https://firebase.google.com/docs/database/admin/start)
- [Firebase Console](https://console.firebase.google.com)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
