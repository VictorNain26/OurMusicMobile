import React from 'react';
import { View, StyleSheet } from 'react-native';
import AzuracastPlayer from '../../components/AzuracastPlayer';

const App: React.FC = () => {
  return (
    <View style={styles.container}>
      <AzuracastPlayer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
});

export default App;