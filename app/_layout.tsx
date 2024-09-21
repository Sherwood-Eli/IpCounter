import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack 
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: '#866210'}
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
