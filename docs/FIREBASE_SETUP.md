# Firebase Setup for Interactive Bubbles

## Overview

The Interactive Bubbles application now uses Firebase Firestore for data storage instead of localStorage. This provides real-time synchronization, better data persistence, and the ability to share data across devices.

## Firebase Configuration

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or use existing project: `todo-flutter-fb8bf`
3. Enable Google Analytics (optional)

### 2. Enable Firestore Database

1. In your Firebase project, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development
4. Select your preferred location

### 3. Web App Configuration

1. In Firebase Console, click "Add app" and select Web
2. Register your app with a nickname (e.g., "Interactive Bubbles Web")
3. Copy the configuration object

### 4. Update Firebase Configuration

Update the `src/firebase.js` file with your actual web app configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

**Note**: The current configuration uses demo data. You need to replace it with your actual Firebase web app configuration.

## Security Rules

For production, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all users for bubbles and tags
    // You might want to restrict this based on authentication
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

For better security, consider implementing authentication and user-specific rules.

## Data Structure

### Bubbles Collection

```
bubbles/{sessionId}
{
  sessionId: string,
  updatedAt: timestamp,
  bubbles: [
    {
      id: string,
      x: number,
      y: number,
      radius: number,
      title: string,
      description: string,
      fillStyle: string,
      strokeStyle: string,
      tagId: string | null
    }
  ]
}
```

### Tags Collection

```
tags/{sessionId}
{
  sessionId: string,
  updatedAt: timestamp,
  tags: [
    {
      id: string,
      name: string,
      color: string
    }
  ]
}
```

## Session Management

The application uses a session-based approach for anonymous users:
- Each user gets a unique session ID stored in localStorage
- Data is stored in Firestore using this session ID as document ID
- This allows for persistent storage without requiring user authentication

## Fallback Mechanism

The application includes fallback mechanisms:
- If Firestore is unavailable, it falls back to localStorage
- Console logs provide information about storage operations
- Error handling ensures the app continues to work even if Firebase is down

## Performance Considerations

- Auto-save interval increased to 10 seconds to reduce Firestore writes
- Firestore has usage limits on the free tier
- Consider implementing batched writes for production use

## Development vs Production

### Development
- Use Firestore in test mode
- Security rules allow all reads/writes
- Use emulator for local development (optional)

### Production
- Implement proper security rules
- Consider user authentication
- Monitor usage and costs
- Set up backup strategies

## Firestore Emulator (Optional)

For local development, you can use the Firestore emulator:

```bash
npm install -g firebase-tools
firebase init emulators
firebase emulators:start
```

Update your `src/firebase.js` to connect to the emulator in development:

```javascript
import { connectFirestoreEmulator } from 'firebase/firestore';

// Connect to emulator in development
if (process.env.NODE_ENV === 'development') {
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your domain is added to Firebase authorized domains
2. **Permission Denied**: Check your Firestore security rules
3. **Network Errors**: Implement proper error handling and fallbacks
4. **Quota Exceeded**: Monitor your Firestore usage in the Firebase Console

### Debug Logging

Enable debug logging in development:

```javascript
import { enableNetwork, disableNetwork } from 'firebase/firestore';

// Enable logging
if (process.env.NODE_ENV === 'development') {
  console.log('Firebase Firestore debug logging enabled');
}
```

## Migration from localStorage

If you have existing data in localStorage, it will be automatically migrated:
- The app checks localStorage as a fallback if Firestore data is not available
- Users' existing bubbles and tags will be preserved
- No manual migration is required

## Next Steps

Consider these improvements for production:
1. Implement user authentication
2. Add real-time synchronization across devices
3. Implement conflict resolution for concurrent edits
4. Add data validation and sanitization
5. Set up monitoring and analytics 