import * as Location from "expo-location";

export class LocationPermissionError extends Error {}

export async function getCurrentCoords(): Promise<{ lat: number; lng: number }> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new LocationPermissionError(
      "Permissão de localização negada. Ative nas configurações do app para fazer check-in/out."
    );
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return { lat: position.coords.latitude, lng: position.coords.longitude };
}
