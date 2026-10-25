
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const API_URL = 'http://192.168.1.77:3000';

async function bacaRespons(response) {
  const teks = await response.text();

  try {
    return teks ? JSON.parse(teks) : {};
  } catch {
    throw new Error('Respons server bukan JSON yang valid.');
  }
}

export default function App() {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [pesan, setPesan] = useState('');
  const [loading, setLoading] = useState(false);
  const [modeDaftar, setModeDaftar] = useState(false);
  const [halaman, setHalaman] = useState('home');

  async function daftar() {
    if (!nama.trim() || !email.trim() || !password) {
      setPesan('Nama, email, dan password wajib diisi.');
      return;
    }

    setLoading(true);
    setPesan('');

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: nama.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await bacaRespons(response);

      if (!response.ok) {
        throw new Error(data.message || 'Pendaftaran gagal.');
      }

      setModeDaftar(false);
      setPassword('');
      setPesan(data.message || 'Pendaftaran berhasil. Silakan login.');
    } catch (error) {
      setPesan(`Pendaftaran gagal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function masuk() {
    if (!email.trim() || !password) {
      setPesan('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);
    setPesan('');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await bacaRespons(response);

      if (!response.ok) {
        throw new Error(data.message || 'Login gagal.');
      }

      if (!data.token) {
        throw new Error('Token JWT tidak ditemukan dari server.');
      }

      const cekResponse = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${data.token}`,
        },
      });

      const hasilCek = await bacaRespons(cekResponse);

      if (!cekResponse.ok) {
        throw new Error(
          hasilCek.message || 'Pemeriksaan JWT gagal.'
        );
      }

      const akun = hasilCek.user || data.user || {};

      await SecureStore.setItemAsync('jwt_token', data.token);

      setToken(data.token);
      setNama(akun.nama || nama.trim() || 'Pengguna');
      setEmail(akun.email || email.trim());
      setPassword('');
      setHalaman('home');
      setPesan('Login berhasil. JWT valid dan sudah disimpan.');
    } catch (error) {
      setPesan(`Login gagal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function keluar() {
    try {
      await SecureStore.deleteItemAsync('jwt_token');
    } catch (error) {
      console.log('Gagal menghapus token:', error.message);
    }

    setToken('');
    setPassword('');
    setPesan('Kamu sudah logout.');
    setHalaman('home');
  }

  async function mintaIzinNotifikasi() {
    try {
      // Modul dimuat hanya saat fitur notifikasi digunakan.
      const Notifications = await import('expo-notifications');
      const Device = await import('expo-device');

      if (!Device.isDevice) {
        Alert.alert(
          'Perlu HP fisik',
          'Gunakan HP fisik untuk menguji push notification.'
        );
        return;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Notifikasi',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      let izin = await Notifications.getPermissionsAsync();

      if (izin.status !== 'granted') {
        izin = await Notifications.requestPermissionsAsync();
      }

      if (izin.status !== 'granted') {
        setPesan('Izin notifikasi tidak diberikan.');
        Alert.alert(
          'Izin belum diberikan',
          'Kamu dapat mengaktifkannya melalui pengaturan aplikasi di HP.'
        );
        return;
      }

      const projectId =
        Constants.easConfig?.projectId ||
        Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        throw new Error('Project ID Expo tidak ditemukan.');
      }

      const hasilToken = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      const response = await fetch(
        `${API_URL}/notifications/register-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            expo_push_token: hasilToken.data,
          }),
        }
      );

      const data = await bacaRespons(response);

      if (!response.ok) {
        throw new Error(
          data.message || 'Token notifikasi gagal didaftarkan.'
        );
      }

      setPesan('Izin diberikan dan token notifikasi berhasil didaftarkan.');
      Alert.alert('Berhasil', 'Token notifikasi sudah didaftarkan.');
    } catch (error) {
      console.log('Notification error:', error);

      setPesan(
        'Notifikasi belum dapat diaktifkan: ' +
          (error.message || 'Kesalahan tidak diketahui.')
      );

      Alert.alert(
        'Notifikasi belum tersedia',
        'Izin atau token notifikasi belum berhasil diproses. Jika muncul error modul Expo, pengujian push notification mungkin memerlukan runtime yang mendukung modul tersebut.'
      );
    }
  }

  function bukaMenuNotifikasi() {
    Alert.alert(
      'Izin Notifikasi',
      'Aplikasi memerlukan izin agar dapat mengirim notifikasi. Apakah kamu mengizinkannya?',
      [
        {
          text: 'Jangan Izinkan',
          style: 'cancel',
          onPress: () => setPesan('Izin notifikasi tidak diberikan.'),
        },
        {
          text: 'Izinkan',
          onPress: mintaIzinNotifikasi,
        },
      ]
    );
  }

  function tombol(label, aksi, warna = '#087F73', warnaTeks = '#FFFFFF') {
    return (
      <TouchableOpacity
        style={[styles.button, { backgroundColor: warna }]}
        onPress={aksi}
      >
        <Text style={[styles.buttonText, { color: warnaTeks }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  function tampilkanHome() {
    return (
      <>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(nama || 'P').charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.greeting}>Halo, Pengguna! 👋</Text>
          <Text style={styles.description}>
            Selamat datang di PEMOB Modul 3.
          </Text>
        </View>

        <View style={styles.accountBox}>
          <Text style={styles.label}>Nama akun</Text>
          <Text style={styles.accountText}>{nama || 'Pengguna'}</Text>

          <Text style={[styles.label, { marginTop: 14 }]}>Email</Text>
          <Text style={styles.accountText}>{email}</Text>
        </View>

        {tombol('Profil Saya', () => {
          setHalaman('profil');
          setPesan('');
        })}

        {tombol(
          'Notifikasi',
          bukaMenuNotifikasi,
          '#E8F6F2',
          '#087F73'
        )}

        {tombol('Logout dari Akun', keluar, '#C44747')}

        {!!pesan && (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>{pesan}</Text>
          </View>
        )}
      </>
    );
  }

  function tampilkanProfil() {
    return (
      <>
        <Text style={styles.cardTitle}>Profil Saya</Text>
        <Text style={styles.description}>
          Informasi akun yang sedang login.
        </Text>

        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>
            {(nama || 'P').charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.accountBox}>
          <Text style={styles.label}>Nama lengkap</Text>
          <Text style={styles.accountText}>{nama || 'Pengguna'}</Text>

          <Text style={[styles.label, { marginTop: 14 }]}>Email</Text>
          <Text style={styles.accountText}>{email}</Text>

          <Text style={[styles.label, { marginTop: 14 }]}>
            Status akun
          </Text>
          <Text style={styles.accountText}>Login dengan JWT</Text>
        </View>

        {tombol('Kembali ke Home', () => {
          setHalaman('home');
          setPesan('');
        })}

        {tombol('Logout dari Akun', keluar, '#C44747')}
      </>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>M</Text>
          </View>
          <Text style={styles.title}>PEMOB Modul 3</Text>
          <Text style={styles.subtitle}>
            Login JWT dan Push Notification
          </Text>
        </View>

        <View style={styles.card}>
          {token ? (
            halaman === 'profil' ? tampilkanProfil() : tampilkanHome()
          ) : (
            <>
              <Text style={styles.cardTitle}>
                {modeDaftar ? 'Buat Akun' : 'Selamat Datang'}
              </Text>

              <Text style={styles.description}>
                {modeDaftar
                  ? 'Isi data berikut untuk membuat akun.'
                  : 'Silakan login menggunakan akun kamu.'}
              </Text>

              {modeDaftar && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nama</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Masukkan nama"
                    placeholderTextColor="#8A9694"
                    value={nama}
                    onChangeText={setNama}
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan email"
                  placeholderTextColor="#8A9694"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan password"
                  placeholderTextColor="#8A9694"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  loading && styles.buttonDisabled,
                ]}
                onPress={modeDaftar ? daftar : masuk}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>
                    {modeDaftar ? 'Daftar' : 'Login'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => {
                  setModeDaftar(!modeDaftar);
                  setPesan('');
                }}
                disabled={loading}
              >
                <Text style={styles.switchText}>
                  {modeDaftar
                    ? 'Sudah punya akun? Login'
                    : 'Belum punya akun? Daftar'}
                </Text>
              </TouchableOpacity>

              {!!pesan && (
                <View style={styles.statusBox}>
                  <Text style={styles.statusText}>{pesan}</Text>
                </View>
              )}
            </>
          )}
        </View>

        <Text style={styles.footer}>
          Sistem Informasi • Pemrograman Mobile
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#087F73',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#087F73',
    fontSize: 32,
    fontWeight: 'bold',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#DDF5F1',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
  },
  cardTitle: {
    color: '#183A36',
    fontSize: 23,
    fontWeight: 'bold',
  },
  description: {
    color: '#687A77',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 24,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#E8F6F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    color: '#087F73',
    fontSize: 32,
    fontWeight: 'bold',
  },
  greeting: {
    color: '#183A36',
    fontSize: 23,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  accountBox: {
    backgroundColor: '#F7F9FA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCE6E3',
    padding: 16,
    marginBottom: 14,
  },
  label: {
    color: '#687A77',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 5,
  },
  accountText: {
    color: '#183A36',
    fontSize: 15,
    fontWeight: '500',
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E8F6F2',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  avatarLargeText: {
    color: '#087F73',
    fontSize: 36,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 18,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#DCE6E3',
    backgroundColor: '#F8FAF9',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#183A36',
    fontSize: 15,
  },
  button: {
    minHeight: 50,
    backgroundColor: '#087F73',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  switchButton: {
    alignItems: 'center',
    paddingTop: 20,
  },
  switchText: {
    color: '#087F73',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBox: {
    backgroundColor: '#E8F6F2',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  statusText: {
    color: '#185B50',
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    color: '#DDF5F1',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
});
