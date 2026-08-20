import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Alert, Platform, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

const PONTO_ENCONTRO_SESI = {
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
        Alert.alert('Acesso Negado', 'Ative o GPS para iniciar a busca!');
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (newLocation) => {
          setLocation(newLocation);

          const d = getDistance(
            { latitude: newLocation.coords.latitude, longitude: newLocation.coords.longitude },
            PONTO_ENCONTRO_SESI
          );
          setDistancia(d);

          // Gestão de Precisão: Raio de tolerância de 8 metros instalado
          if (d <= 8) {
            setChegou(true);
          }

          mapRef.current?.animateToRegion({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            latitudeDelta: 0.002,
            longitudeDelta: 0.002,
          }, 1000);
        }
      );
    })();

    // Otimização de Hardware: Desinscrição ativada ao sair da tela
    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  const getHudTheme = () => {
    if (distancia === null) return { text: "ESCANEANDO...", color: "#FFF", bg: "rgba(44, 62, 80, 0.85)" };
    if (distancia < 20) return { text: "FOGO! 🔥 MUITO PERTO", color: "#FFF", bg: "rgba(231, 76, 60, 0.9)" };
    if (distancia <= 100) return { text: "QUENTE! ☀️ SINAL FORTE", color: "#FFF", bg: "rgba(241, 196, 15, 0.9)" };
    return { text: "GELADO... 🧊 DISTANTE", color: "#FFF", bg: "rgba(52, 152, 219, 0.85)" };
  };

  const hudTheme = getHudTheme();

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
        <ActivityIndicator size="large" color="#e67e22" />
        <Text style={styles.loadingText}>SINCRO_GPS_RADAR...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      {/* Mapa expandido ocupa 100% da tela para maior imersão visual */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.mapAbsolute}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        }}
        showsUserLocation={true}
      >
        {distancia !== null && distancia < 10 && (
          <>
            <Circle
              center={PONTO_ENCONTRO_SESI}
              radius={10}
              fillColor="rgba(46, 204, 113, 0.3)"
              strokeColor="#2ecc71"
              strokeWidth={2}
            />
            <Marker coordinate={PONTO_ENCONTRO_SESI}>
              <Ionicons name="trophy" size={40} color="#f1c40f" />
            </Marker>
          </>
        )}
      </MapView>

      {/* Elementos HUD flutuando sobre o mapa (Estilo Interface de Jogo) */}
      <SafeAreaView style={styles.overlayContainer} pointerEvents="box-none">
        <View style={styles.gameHeader}>
          <Ionicons name="terminal" size={20} color="#e67e22" />
          <Text style={styles.gameTitle}>MISSÃO: CAÇA AO TESOURO</Text>
        </View>

        <View style={styles.hudFlexEnd}>
          <View style={[styles.hudCard, { backgroundColor: hudTheme.bg }]}>
            <Text style={[styles.statusLabel, { color: hudTheme.color }]}>
              {hudTheme.text}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{distancia ?? 0}M</Text>
                <Text style={styles.statLabel}>DISTÂNCIA</Text>
              </View>

              <View style={styles.verticalLine} />

              <View style={styles.statBox}>
                <Ionicons
                  name={distancia && distancia < 20 ? "thunderstorm" : "pulse"}
                  size={28}
                  color="#FFF"
                />
                <Text style={styles.statLabel}>PROXIMIDADE</Text>
              </View>
            </View>
          </View>

          {chegou && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => Alert.alert("Vitória! 🏆", "Desafio concluído! Você encontrou o tesouro do SESI.")}
            >
              <Text style={styles.actionButtonText}>COLETAR RECOMPENSA</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  mapAbsolute: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#e67e22',
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  errorText: {
    marginTop: 10,
    color: '#e74c3c',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#e67e22',
    marginTop: 10,
  },
  gameTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginLeft: 8,
  },
  hudFlexEnd: {
    width: '100%',
    marginBottom: 10,
  },
  hudCard: {
    borderRadius: 24,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFF',
    fontSize: 34,
    fontWeight: '900',
  },
  statLabel: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
    opacity: 0.8,
  },
  verticalLine: {
    width: 1,
    height: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  actionButton: {
    backgroundColor: '#2ecc71',
    padding: 18,
    borderRadius: 18,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1.5,
  },
});
