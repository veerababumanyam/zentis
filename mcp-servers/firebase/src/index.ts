import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  initializeApp,
  getApps,
  cert,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage, type Storage } from "firebase-admin/storage";
import * as fs from "fs";

interface FirebaseConfig {
  serviceAccountPath?: string;
  databaseURL?: string;
}

let db: Firestore;
let auth: Auth;
let storage: Storage;

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase(config: FirebaseConfig): void {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    db = getFirestore();
    auth = getAuth();
    storage = getStorage();
    return;
  }

  let serviceAccount: ServiceAccount | undefined;

  if (config.serviceAccountPath) {
    const keyContent = fs.readFileSync(config.serviceAccountPath, "utf-8");
    serviceAccount = JSON.parse(keyContent) as ServiceAccount;
  } else {
    const keyPath = process.env.FIREBASE_KEY_PATH;
    const keyContent = process.env.FIREBASE_KEY_JSON;

    if (keyPath) {
      const content = fs.readFileSync(keyPath, "utf-8");
      serviceAccount = JSON.parse(content) as ServiceAccount;
    } else if (keyContent) {
      serviceAccount = JSON.parse(keyContent) as ServiceAccount;
    } else {
      throw new Error(
        "Firebase credentials not found. Set FIREBASE_KEY_PATH or FIREBASE_KEY_JSON"
      );
    }
  }

  const appConfig: any = {
    credential: cert(serviceAccount),
  };

  if (config.databaseURL) {
    appConfig.databaseURL = config.databaseURL;
  }

  initializeApp(appConfig);
  db = getFirestore();
  auth = getAuth();
  storage = getStorage();
}

/**
 * Create MCP Server with Firebase Tools
 */
const server = new Server({
  name: "firebase-mcp",
  version: "1.0.0",
});

// Tool definitions
const firebaseTools: Tool[] = [
  {
    name: "firestore_get_document",
    description: "Retrieve a single document from Firestore by collection and ID",
    inputSchema: {
      type: "object" as const,
      properties: {
        collection: {
          type: "string",
          description: "The Firestore collection name",
        },
        document_id: {
          type: "string",
          description: "The document ID to retrieve",
        },
      },
      required: ["collection", "document_id"],
    },
  },
  {
    name: "firestore_query_collection",
    description:
      "Query documents from a Firestore collection with optional filters",
    inputSchema: {
      type: "object" as const,
      properties: {
        collection: {
          type: "string",
          description: "The Firestore collection name",
        },
        filters: {
          type: "array",
          description:
            "Array of filter conditions (field, operator, value). Operators: ==, <, <=, >, >=, !=, in, array-contains",
          items: {
            type: "object",
            properties: {
              field: { type: "string" },
              operator: { type: "string" },
              value: { type: ["string", "number", "boolean", "null"] },
            },
          },
        },
        order_by: {
          type: "object",
          description: "Order results by field",
          properties: {
            field: { type: "string" },
            direction: { type: "string", enum: ["asc", "desc"] },
          },
        },
        limit_results: {
          type: "number",
          description: "Maximum number of documents to return (default: 50)",
        },
      },
      required: ["collection"],
    },
  },
  {
    name: "firestore_create_document",
    description: "Create a new document in Firestore",
    inputSchema: {
      type: "object" as const,
      properties: {
        collection: {
          type: "string",
          description: "The Firestore collection name",
        },
        document_id: {
          type: "string",
          description: "The document ID (optional, will be auto-generated if absent)",
        },
        data: {
          type: "object",
          description: "The document data to create",
        },
      },
      required: ["collection", "data"],
    },
  },
  {
    name: "firestore_update_document",
    description: "Update an existing document in Firestore",
    inputSchema: {
      type: "object" as const,
      properties: {
        collection: {
          type: "string",
          description: "The Firestore collection name",
        },
        document_id: {
          type: "string",
          description: "The document ID to update",
        },
        data: {
          type: "object",
          description: "The fields to update",
        },
      },
      required: ["collection", "document_id", "data"],
    },
  },
  {
    name: "firestore_delete_document",
    description: "Delete a document from Firestore",
    inputSchema: {
      type: "object" as const,
      properties: {
        collection: {
          type: "string",
          description: "The Firestore collection name",
        },
        document_id: {
          type: "string",
          description: "The document ID to delete",
        },
      },
      required: ["collection", "document_id"],
    },
  },
  {
    name: "auth_create_user",
    description: "Create a new user account in Firebase Authentication",
    inputSchema: {
      type: "object" as const,
      properties: {
        email: {
          type: "string",
          description: "User email address",
        },
        password: {
          type: "string",
          description: "User password (minimum 6 characters)",
        },
        display_name: {
          type: "string",
          description: "User display name (optional)",
        },
      },
      required: ["email", "password"],
    },
  },
  {
    name: "auth_get_user",
    description: "Get user information by email from Firebase Authentication",
    inputSchema: {
      type: "object" as const,
      properties: {
        email: {
          type: "string",
          description: "User email address",
        },
      },
      required: ["email"],
    },
  },
  {
    name: "auth_update_user",
    description: "Update user information in Firebase Authentication",
    inputSchema: {
      type: "object" as const,
      properties: {
        uid: {
          type: "string",
          description: "User UID",
        },
        email: {
          type: "string",
          description: "New email address (optional)",
        },
        password: {
          type: "string",
          description: "New password (optional)",
        },
        display_name: {
          type: "string",
          description: "New display name (optional)",
        },
      },
      required: ["uid"],
    },
  },
  {
    name: "auth_delete_user",
    description: "Delete a user from Firebase Authentication",
    inputSchema: {
      type: "object" as const,
      properties: {
        uid: {
          type: "string",
          description: "User UID",
        },
      },
      required: ["uid"],
    },
  },
  {
    name: "storage_list_files",
    description: "List files in Firebase Storage bucket",
    inputSchema: {
      type: "object" as const,
      properties: {
        prefix: {
          type: "string",
          description: "Optional prefix/directory to list files from",
        },
      },
    },
  },
  {
    name: "storage_get_file_url",
    description: "Get a public URL for a file in Firebase Storage",
    inputSchema: {
      type: "object" as const,
      properties: {
        file_path: {
          type: "string",
          description: "Path to the file in storage",
        },
      },
      required: ["file_path"],
    },
  },
];

/**
 * Register all tools with the server
 */
(server.setRequestHandler as any)(
  "tools/list",
  async () => {
    return { tools: firebaseTools };
  }
);

/**
 * Handle tool execution
 */
(server.setRequestHandler as any)("tools/call", async (request: any) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Firestore operations
      case "firestore_get_document": {
        const docRef = db.collection(args.collection as string).doc(args.document_id as string);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Document not found in collection "${args.collection}" with ID "${args.document_id}"`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { id: docSnap.id, ...docSnap.data() },
                null,
                2
              ),
            },
          ],
        };
      }

      case "firestore_query_collection": {
        let queryRef: any = db.collection(args.collection as string);

        // Apply filters
        if (args.filters && Array.isArray(args.filters)) {
          for (const filter of args.filters) {
            queryRef = queryRef.where(filter.field, filter.operator, filter.value);
          }
        }

        // Apply ordering
        if (args.order_by) {
          queryRef = queryRef.orderBy(
            args.order_by.field,
            (args.order_by.direction || "asc") as "asc" | "desc"
          );
        }

        // Apply limit
        const limitNum = Math.min(args.limit_results || 50, 100);
        queryRef = queryRef.limit(limitNum);

        const querySnapshot = await queryRef.get();

        const documents = querySnapshot.docs.map((docSnap: any) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  count: documents.length,
                  documents,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "firestore_create_document": {
        const collectionRef = db.collection(args.collection as string);
        let docRef;

        if (args.document_id) {
          docRef = collectionRef.doc(args.document_id);
        } else {
          docRef = collectionRef.doc();
        }

        await docRef.set(args.data || {});

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  collection: args.collection,
                  document_id: docRef.id,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "firestore_update_document": {
        const docRef = db.collection(args.collection as string).doc(args.document_id as string);
        await docRef.update(args.data || {});

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: `Document updated in "${args.collection}" with ID "${args.document_id}"`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "firestore_delete_document": {
        const docRef = db.collection(args.collection as string).doc(args.document_id as string);
        await docRef.delete();

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: `Document deleted from "${args.collection}" with ID "${args.document_id}"`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Authentication operations
      case "auth_create_user": {
        const userRecord = await auth.createUser({
          email: args.email,
          password: args.password,
          displayName: args.display_name,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  uid: userRecord.uid,
                  email: userRecord.email,
                  display_name: userRecord.displayName,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "auth_get_user": {
        const userRecord = await auth.getUserByEmail(args.email);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  uid: userRecord.uid,
                  email: userRecord.email,
                  display_name: userRecord.displayName,
                  phone_number: userRecord.phoneNumber,
                  created_at: userRecord.metadata?.creationTime,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "auth_update_user": {
        const updateData: any = {};
        if (args.email) updateData.email = args.email;
        if (args.password) updateData.password = args.password;
        if (args.display_name) updateData.displayName = args.display_name;

        const userRecord = await auth.updateUser(args.uid, updateData);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  uid: userRecord.uid,
                  email: userRecord.email,
                  display_name: userRecord.displayName,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "auth_delete_user": {
        await auth.deleteUser(args.uid);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: `User with UID "${args.uid}" has been deleted`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Storage operations
      case "storage_list_files": {
        const [files] = await storage.bucket().getFiles({
          prefix: args.prefix || "",
        });

        const fileList = files.map((file: any) => ({
          name: file.name,
          size: file.metadata?.size,
          updated: file.metadata?.updated,
          content_type: file.metadata?.contentType,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  count: fileList.length,
                  files: fileList,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "storage_get_file_url": {
        const storageRef = storage.bucket();

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  file_path: args.file_path,
                  public_url: `https://storage.googleapis.com/${storageRef.name}/${args.file_path}`,
                  gs_url: `gs://${storageRef.name}/${args.file_path}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text" as const,
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text" as const,
          text: `Error executing tool "${name}": ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Main server startup
 */
async function main(): Promise<void> {
  // Initialize Firebase
  const firebaseConfig: FirebaseConfig = {
    serviceAccountPath: process.env.FIREBASE_KEY_PATH,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  };

  initializeFirebase(firebaseConfig);
  console.error("[Firebase MCP] Firebase initialized successfully");

  // Start stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[Firebase MCP] Server started on stdio");
}

main().catch((error) => {
  console.error("[Firebase MCP] Fatal error:", error);
  process.exit(1);
});
