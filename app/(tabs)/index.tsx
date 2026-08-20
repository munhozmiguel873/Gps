import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Alert, Platform, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

const PONTO_ENCONTRO_PET = {
  latitude: -21.800481,
  longitude: -50.884091,
};

export default function LocalizaPet() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [distancia, setDistancia] = useState<number | null>(null);
  const [chegou, setChegou] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setErrorMsg('O mapa não está disponível na Web.');
      return;
    }

    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Acesso ao GPS negado.');
        Alert.alert('Acesso Negado', 'Precisamos do GPS para localizar o pet!');
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 2,
        },
        (newLocation) => {
          setLocation(newLocation);

          const d = getDistance(
            { latitude: newLocation.coords.latitude, longitude: newLocation.coords.longitude },
            PONTO_ENCONTRO_PET
          );
          setDistancia(d);

          if (d <= 8) {
            setChegou(true);
          }

          // Mantém o mapa centralizado no usuário conforme ele anda
          mapRef.current?.animateToRegion({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            latitudeDelta: 0.002,
            longitudeDelta: 0.002,
          }, 1000);
        }
      );
    })();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []); // Array vazio impede loops de re-assinatura

  const getStatusMessage = () => {
    if (distancia === null) return "Rastreando sinal...";
    if (distancia <= 10) return "O PET ESTÁ AQUI! 🐶";
    if (distancia < 30) return "ESTÁ MUITO PERTO! 🔥";
    if (distancia < 100) return "SINAL FICANDO FORTE... ☀️";
    return "PET AINDA DISTANTE... 🧊";
  };

  if (errorMsg) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle" size={50} color="#e74c3c" />
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Sincronizando GPS...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <View style={styles.brandHeader}>
        <View style={styles.logoCircle}>
          <Ionicons name="paw" size={32} color="#3498db" />
        </View>
        <View>
          <Text style={styles.brandName}>LOCALIZA</Text>
          <Text style={styles.appName}>Pet Tracker</Text>
        </View>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={styles.map}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.002,
            longitudeDelta: 0.002,
          }}
          showsUserLocation={true}
        >
          <Circle
            center={PONTO_ENCONTRO_PET}
            radius={15}
            fillColor="rgba(52, 152, 219, 0.2)"
            strokeColor="#3498db"
            strokeWidth={2}
          />
          <Marker coordinate={PONTO_ENCONTRO_PET} title="Ponto de Encontro">
            <Ionicons name="location" size={35} color="#e74c3c" />
          </Marker>
        </MapView>
      </View>

      <View style={styles.hud}>
        <Text style={styles.statusLabel}>{getStatusMessage()}</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{distancia ?? 0}m</Text>
            <Text style={styles.statLabel}>Distância</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Ionicons
              name={distancia && distancia < 50 ? "flash" : "wifi-outline"}
              size={32}
              color={distancia && distancia < 50 ? "#f1c40f" : "#bdc3c7"}
            />
            <Text style={styles.statLabel}>Sinal</Text>
          </View>
        </View>

        {chegou && (
          <TouchableOpacity
            style={styles.winButton}
            onPress={() => Alert.alert("Sucesso!", "Você encontrou o pet!")}
          >
            <Text style={styles.winButtonText}>CONFIRMAR RESGATE</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 10,
    color: '#3498db',
    fontWeight: 'bold'
  },
  errorText: {
    marginTop: 10,
    color: '#e74c3c',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 15,
    elevation: 4
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  brandName: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2
  },
  appName: {
    color: '#2C3E50',
    fontSize: 24,
    fontWeight: '900'
  },
  mapContainer: {
    height: '52%',
    width: '92%',
    alignSelf: 'center',
    borderRadius: 35,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#FFF',
    elevation: 8
  },
  map: {
    width: '100%',
    height: '100%'
  },
  hud: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  statusLabel: {
    color: '#2C3E50',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 15
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 25,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 2
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    color: '#3498db',
    fontSize: 32,
    fontWeight: 'bold'
  },
  statLabel: {
    color: '#95A5A6',
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold'
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#ECF0F1'
  },
  winButton: {
    backgroundColor: '#2ecc71',
    width: '100%',
    padding: 18,
    borderRadius: 20,
    marginTop: 20,
    alignItems: 'center'
  },
  winButtonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 18
  }
});