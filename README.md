# 🫧 Interactive Bubbles (To-Round)

Interactive application with physical bubbles supporting internationalization.

## 🌟 Features

- **Physics simulation**: Uses Matter.js for realistic physics
- **Interactivity**: Click, drag and edit bubbles
- **Multilingual**: Support for English and Ukrainian languages
- **Responsive design**: Works on mobile and desktop devices
- **Tag system**: Ability to categorize bubbles with color coding
- **Cloud storage**: Data is saved in Firebase Firestore with localStorage fallback

## 🚀 Quick Start

### Installing dependencies

```bash
npm install
```

### Firebase Setup

1. Follow the instructions in `docs/FIREBASE_SETUP.md`
2. Update `src/firebase.js` with your Firebase configuration
3. Enable Firestore in your Firebase project

### Running

```bash
npm start
```

## 📁 File Structure

```
To-Round/
├── src/
│   ├── pages/
│   │   └── BubblesPage.js          # Main component with bubbles
│   ├── components/
│   │   └── LanguageSelector.js     # Language selector component
│   ├── locales/
│   │   ├── en/
│   │   │   └── translation.json    # English translations
│   │   └── uk/
│   │       └── translation.json    # Ukrainian translations
│   ├── firebase.js                 # Firebase configuration
│   ├── services/
│   │   └── firestoreService.js     # Firestore data operations
│   └── i18n.js                     # Internationalization configuration
├── docs/
│   ├── INTERNATIONALIZATION_SETUP.md  # i18n documentation
│   └── FIREBASE_SETUP.md           # Firebase setup guide
├── package.json
└── README.md
```

## 🎮 How to Use

### On Desktop:
1. **Add bubble**: Click the "Add Bubble" button
2. **Edit**: Click on a bubble to edit it
3. **Drag**: Grab a bubble with your mouse and drag it
4. **Change language**: Click on the globe icon in the top right corner

### On Mobile:
1. **Add bubble**: Press the floating "+" button at the bottom right
2. **Edit**: Tap on a bubble
3. **Drag**: Touch and hold a bubble, then drag it
4. **Change language**: Tap on the globe icon at the top right

## 🏷️ Working with Tags

1. **Create tag**: In the edit dialog, click "Add Tag"
2. **Choose color**: Use the color palette
3. **Apply to bubble**: Select a tag from the dropdown list
4. **Manage tags**: Click "Manage Tags" to edit

## 🌍 Supported Languages

- 🇺🇸 **English**
- 🇺🇦 **Українська**

### Adding a New Language

1. Create a folder `src/locales/{language_code}/`
2. Add a `translation.json` file with translations
3. Update `src/i18n.js`
4. Add the language to `src/components/LanguageSelector.js`

Detailed instructions in the file `docs/INTERNATIONALIZATION_SETUP.md`

## 🛠️ Technologies

- **React** - UI library
- **Material-UI (MUI)** - Interface components
- **Matter.js** - Physics engine
- **react-i18next** - Internationalization
- **Firebase Firestore** - Cloud database with localStorage fallback

## 📱 Responsiveness

The application is fully adapted for:
- **Mobile devices** (< 768px)
- **Tablets** (768px - 1024px)  
- **Desktops** (> 1024px)

## 🎨 Customization

### Default bubble colors:
```javascript
const defaultColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];
```

### Physics parameters:
```javascript
// In createBubble function
restitution: 0.8,     // Elasticity
frictionAir: 0.01,    // Air resistance
gravity.y: 0.3        // Gravity
```

## 📄 License

MIT License

## 👨‍💻 Author

Created as part of an interactive components project. 