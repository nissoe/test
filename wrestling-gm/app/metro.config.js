// המנוע והתוכן יושבים מחוץ לתיקיית האפליקציה, אז Metro צריך לראות גם אותם.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '..', 'engine'), path.resolve(__dirname, '..', 'content')];
module.exports = config;
