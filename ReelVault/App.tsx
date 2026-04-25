import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppRoot from './src/app/AppRoot';

const App = () => (
  <SafeAreaProvider>
    <AppRoot />
  </SafeAreaProvider>
);

export default App;
